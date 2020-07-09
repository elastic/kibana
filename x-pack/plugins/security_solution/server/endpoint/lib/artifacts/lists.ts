/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createHash } from 'crypto';
import { deflate } from 'zlib';
import { ExceptionListItemSchema } from '../../../../../lists/common/schemas';
import { validate } from '../../../../common/validate';

import { Entry, EntryNested } from '../../../../../lists/common/schemas/types/entries';
import { FoundExceptionListItemSchema } from '../../../../../lists/common/schemas/response/found_exception_list_item_schema';
import { ExceptionListClient } from '../../../../../lists/server';
import {
  InternalArtifactSchema,
  TranslatedEntry,
  WrappedTranslatedExceptionList,
  wrappedTranslatedExceptionList,
  TranslatedEntryNestedEntry,
  translatedEntryNestedEntry,
  translatedEntry as translatedEntryType,
  TranslatedEntryMatcher,
  translatedEntryMatchMatcher,
  translatedEntryMatchAnyMatcher,
  TranslatedExceptionListItem,
} from '../../schemas';
import { ArtifactConstants } from './common';

export async function buildArtifact(
  exceptions: WrappedTranslatedExceptionList,
  os: string,
  schemaVersion: string
): Promise<InternalArtifactSchema> {
  const exceptionsBuffer = Buffer.from(JSON.stringify(exceptions));
  const sha256 = createHash('sha256').update(exceptionsBuffer.toString()).digest('hex');

  // Keep compression info empty in case its a duplicate. Lazily compress before committing if needed.
  return {
    identifier: `${ArtifactConstants.GLOBAL_ALLOWLIST_NAME}-${os}-${schemaVersion}`,
    compressionAlgorithm: 'none',
    encryptionAlgorithm: 'none',
    decodedSha256: sha256,
    encodedSha256: sha256,
    decodedSize: exceptionsBuffer.byteLength,
    encodedSize: exceptionsBuffer.byteLength,
    created: Date.now(),
    body: exceptionsBuffer.toString('base64'),
  };
}

export async function getFullEndpointExceptionList(
  eClient: ExceptionListClient,
  os: string,
  schemaVersion: string
): Promise<WrappedTranslatedExceptionList> {
  const exceptions: WrappedTranslatedExceptionList = { entries: [] };
  let numResponses = 0;
  let page = 1;

  do {
    const response = await eClient.findExceptionListItem({
      listId: 'endpoint_list',
      namespaceType: 'agnostic',
      filter: `exception-list-agnostic.attributes._tags:\"os:${os}\"`,
      perPage: 100,
      page,
      sortField: 'created_at',
      sortOrder: 'desc',
    });

    if (response?.data !== undefined) {
      numResponses = response.data.length;

      exceptions.entries = exceptions.entries.concat(
        translateToEndpointExceptions(response, schemaVersion)
      );

      page++;
    } else {
      break;
    }
  } while (numResponses > 0);

  const [validated, errors] = validate(exceptions, wrappedTranslatedExceptionList);
  if (errors != null) {
    throw new Error(errors);
  }
  return validated as WrappedTranslatedExceptionList;
}

/**
 * Translates Exception list items to Exceptions the endpoint can understand
 * @param exc
 */
export function translateToEndpointExceptions(
  exc: FoundExceptionListItemSchema,
  schemaVersion: string
): TranslatedExceptionListItem[] {
  if (schemaVersion === 'v1') {
    return exc.data.map((item) => {
      return translateItem(schemaVersion, item);
    });
  } else {
    throw new Error('unsupported schemaVersion');
  }
}

function getMatcherFunction(field: string, matchAny?: boolean): TranslatedEntryMatcher {
  return matchAny
    ? field.endsWith('.text')
      ? 'exact_caseless_any'
      : 'exact_cased_any'
    : field.endsWith('.text')
    ? 'exact_caseless'
    : 'exact_cased';
}

function normalizeFieldName(field: string): string {
  return field.endsWith('.text') ? field.substring(0, field.length - 5) : field;
}

function translateItem(
  schemaVersion: string,
  item: ExceptionListItemSchema
): TranslatedExceptionListItem {
  return {
    type: item.type,
    entries: item.entries.reduce((translatedEntries: TranslatedEntry[], entry) => {
      const translatedEntry = translateEntry(schemaVersion, entry);
      if (translatedEntry !== undefined && translatedEntryType.is(translatedEntry)) {
        translatedEntries.push(translatedEntry);
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
      const nestedEntries = entry.entries.reduce(
        (entries: TranslatedEntryNestedEntry[], nestedEntry) => {
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
