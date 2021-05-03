/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
import { deflate } from 'zlib';
import { ExceptionListItemSchema } from '../../../../../lists/common/schemas';
import { validate } from '../../../../common/validate';

import { Entry, EntryNested } from '../../../../../lists/common/schemas/types';
import { ExceptionListClient } from '../../../../../lists/server';
import { ENDPOINT_LIST_ID, ENDPOINT_TRUSTED_APPS_LIST_ID } from '../../../../common/shared_imports';
import {
  internalArtifactCompleteSchema,
  InternalArtifactCompleteSchema,
  InternalArtifactSchema,
  TranslatedEntry,
  translatedEntry as translatedEntryType,
  translatedEntryMatchAnyMatcher,
  TranslatedEntryMatcher,
  translatedEntryMatchMatcher,
  TranslatedEntryMatchWildcardMatcher,
  translatedEntryMatchWildcardMatcher,
  TranslatedEntryNestedEntry,
  translatedEntryNestedEntry,
  TranslatedExceptionListItem,
  WrappedTranslatedExceptionList,
  wrappedTranslatedExceptionList,
} from '../../schemas';
import { ENDPOINT_EVENT_FILTERS_LIST_ID } from '../../../../../lists/common/constants';

export async function buildArtifact(
  exceptions: WrappedTranslatedExceptionList,
  schemaVersion: string,
  os: string,
  name: string
): Promise<InternalArtifactCompleteSchema> {
  const exceptionsBuffer = Buffer.from(JSON.stringify(exceptions));
  const sha256 = createHash('sha256').update(exceptionsBuffer.toString()).digest('hex');

  // Keep compression info empty in case its a duplicate. Lazily compress before committing if needed.
  return {
    identifier: `${name}-${os}-${schemaVersion}`,
    compressionAlgorithm: 'none',
    encryptionAlgorithm: 'none',
    decodedSha256: sha256,
    encodedSha256: sha256,
    decodedSize: exceptionsBuffer.byteLength,
    encodedSize: exceptionsBuffer.byteLength,
    body: exceptionsBuffer.toString('base64'),
  };
}

export async function maybeCompressArtifact(
  uncompressedArtifact: InternalArtifactSchema
): Promise<InternalArtifactSchema> {
  const compressedArtifact = { ...uncompressedArtifact };
  if (internalArtifactCompleteSchema.is(uncompressedArtifact)) {
    const compressedArtifactBody = await compressExceptionList(
      Buffer.from(uncompressedArtifact.body, 'base64')
    );
    compressedArtifact.body = compressedArtifactBody.toString('base64');
    compressedArtifact.encodedSize = compressedArtifactBody.byteLength;
    compressedArtifact.compressionAlgorithm = 'zlib';
    compressedArtifact.encodedSha256 = createHash('sha256')
      .update(compressedArtifactBody)
      .digest('hex');
  }
  return compressedArtifact;
}

export function isCompressed(artifact: InternalArtifactSchema) {
  return artifact.compressionAlgorithm === 'zlib';
}

export async function getFilteredEndpointExceptionList(
  eClient: ExceptionListClient,
  schemaVersion: string,
  filter: string,
  listId:
    | typeof ENDPOINT_LIST_ID
    | typeof ENDPOINT_TRUSTED_APPS_LIST_ID
    | typeof ENDPOINT_EVENT_FILTERS_LIST_ID
): Promise<WrappedTranslatedExceptionList> {
  const exceptions: WrappedTranslatedExceptionList = { entries: [] };
  let page = 1;
  let paging = true;

  while (paging) {
    const response = await eClient.findExceptionListItem({
      listId,
      namespaceType: 'agnostic',
      filter,
      perPage: 100,
      page,
      sortField: 'created_at',
      sortOrder: 'desc',
    });

    if (response?.data !== undefined) {
      exceptions.entries = exceptions.entries.concat(
        translateToEndpointExceptions(response.data, schemaVersion)
      );

      paging = (page - 1) * 100 + response.data.length < response.total;
      page++;
    } else {
      break;
    }
  }

  const [validated, errors] = validate(exceptions, wrappedTranslatedExceptionList);
  if (errors != null) {
    throw new Error(errors);
  }
  return validated as WrappedTranslatedExceptionList;
}

export async function getEndpointExceptionList(
  eClient: ExceptionListClient,
  schemaVersion: string,
  os: string
): Promise<WrappedTranslatedExceptionList> {
  const filter = `exception-list-agnostic.attributes.os_types:\"${os}\"`;

  return getFilteredEndpointExceptionList(eClient, schemaVersion, filter, ENDPOINT_LIST_ID);
}

export async function getEndpointTrustedAppsList(
  eClient: ExceptionListClient,
  schemaVersion: string,
  os: string,
  policyId?: string
): Promise<WrappedTranslatedExceptionList> {
  const osFilter = `exception-list-agnostic.attributes.os_types:\"${os}\"`;
  const policyFilter = `(exception-list-agnostic.attributes.tags:\"policy:all\"${
    policyId ? ` or exception-list-agnostic.attributes.tags:\"policy:${policyId}\"` : ''
  })`;

  return getFilteredEndpointExceptionList(
    eClient,
    schemaVersion,
    `${osFilter} and ${policyFilter}`,
    ENDPOINT_TRUSTED_APPS_LIST_ID
  );
}

export async function getEndpointEventFiltersList(
  eClient: ExceptionListClient,
  schemaVersion: string,
  os: string,
  policyId?: string
): Promise<WrappedTranslatedExceptionList> {
  const osFilter = `exception-list-agnostic.attributes.os_types:\"${os}\"`;
  const policyFilter = `(exception-list-agnostic.attributes.tags:\"policy:all\"${
    policyId ? ` or exception-list-agnostic.attributes.tags:\"policy:${policyId}\"` : ''
  })`;

  await eClient.createEndpointEventFiltersList();

  return getFilteredEndpointExceptionList(
    eClient,
    schemaVersion,
    `${osFilter} and ${policyFilter}`,
    ENDPOINT_EVENT_FILTERS_LIST_ID
  );
}

/**
 * Translates Exception list items to Exceptions the endpoint can understand
 * @param exceptions
 * @param schemaVersion
 */
export function translateToEndpointExceptions(
  exceptions: ExceptionListItemSchema[],
  schemaVersion: string
): TranslatedExceptionListItem[] {
  const entrySet = new Set();
  const entriesFiltered: TranslatedExceptionListItem[] = [];
  if (schemaVersion === 'v1') {
    exceptions.forEach((entry) => {
      const translatedItem = translateItem(schemaVersion, entry);
      const entryHash = createHash('sha256').update(JSON.stringify(translatedItem)).digest('hex');
      if (!entrySet.has(entryHash)) {
        entriesFiltered.push(translatedItem);
        entrySet.add(entryHash);
      }
    });
    return entriesFiltered;
  } else {
    throw new Error('unsupported schemaVersion');
  }
}

function getMatcherFunction(field: string, matchAny?: boolean): TranslatedEntryMatcher {
  return matchAny
    ? field.endsWith('.caseless')
      ? 'exact_caseless_any'
      : 'exact_cased_any'
    : field.endsWith('.caseless')
    ? 'exact_caseless'
    : 'exact_cased';
}

function getMatcherWildcardFunction(field: string): TranslatedEntryMatchWildcardMatcher {
  return field.endsWith('.caseless') ? 'wildcard_caseless' : 'wildcard_cased';
}

function normalizeFieldName(field: string): string {
  return field.endsWith('.caseless') ? field.substring(0, field.lastIndexOf('.')) : field;
}

function translateItem(
  schemaVersion: string,
  item: ExceptionListItemSchema
): TranslatedExceptionListItem {
  const itemSet = new Set();
  return {
    type: item.type,
    entries: item.entries.reduce<TranslatedEntry[]>((translatedEntries, entry) => {
      const translatedEntry = translateEntry(schemaVersion, entry);
      if (translatedEntry !== undefined && translatedEntryType.is(translatedEntry)) {
        const itemHash = createHash('sha256').update(JSON.stringify(translatedEntry)).digest('hex');
        if (!itemSet.has(itemHash)) {
          translatedEntries.push(translatedEntry);
          itemSet.add(itemHash);
        }
      }
      return translatedEntries;
    }, []),
  };
}

function translateEntry(
  schemaVersion: string,
  entry: Entry | EntryNested
): TranslatedEntry | undefined {
  switch (entry.type) {
    case 'nested': {
      const nestedEntries = entry.entries.reduce<TranslatedEntryNestedEntry[]>(
        (entries, nestedEntry) => {
          const translatedEntry = translateEntry(schemaVersion, nestedEntry);
          if (nestedEntry !== undefined && translatedEntryNestedEntry.is(translatedEntry)) {
            entries.push(translatedEntry);
          }
          return entries;
        },
        []
      );
      return {
        entries: nestedEntries,
        field: entry.field,
        type: 'nested',
      };
    }
    case 'match': {
      const matcher = getMatcherFunction(entry.field);
      return translatedEntryMatchMatcher.is(matcher)
        ? {
            field: normalizeFieldName(entry.field),
            operator: entry.operator,
            type: matcher,
            value: entry.value,
          }
        : undefined;
    }
    case 'match_any': {
      const matcher = getMatcherFunction(entry.field, true);
      return translatedEntryMatchAnyMatcher.is(matcher)
        ? {
            field: normalizeFieldName(entry.field),
            operator: entry.operator,
            type: matcher,
            value: entry.value,
          }
        : undefined;
    }
    case 'wildcard': {
      const matcher = getMatcherWildcardFunction(entry.field);
      return translatedEntryMatchWildcardMatcher.is(matcher)
        ? {
            field: normalizeFieldName(entry.field),
            operator: entry.operator,
            type: matcher,
            value: entry.value,
          }
        : undefined;
    }
  }
}

export async function compressExceptionList(buffer: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    deflate(buffer, function (err, buf) {
      if (err) {
        reject(err);
      } else {
        resolve(buf);
      }
    });
  });
}
