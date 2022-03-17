/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import path from 'path';
import { createHash } from 'crypto';
import type {
  Entry,
  EntryNested,
  ExceptionListItemSchema,
} from '@kbn/securitysolution-io-ts-list-types';
import { validate } from '@kbn/securitysolution-io-ts-utils';
import { hasSimpleExecutableName, OperatingSystem } from '@kbn/securitysolution-utils';

import {
  ENDPOINT_BLOCKLISTS_LIST_ID,
  ENDPOINT_EVENT_FILTERS_LIST_ID,
  ENDPOINT_HOST_ISOLATION_EXCEPTIONS_LIST_ID,
  ENDPOINT_LIST_ID,
  ENDPOINT_TRUSTED_APPS_LIST_ID,
} from '@kbn/securitysolution-list-constants';
import { ExceptionListClient } from '../../../../../lists/server';
import {
  InternalArtifactCompleteSchema,
  TranslatedEntry,
  TranslatedPerformantEntries,
  translatedPerformantEntries as translatedPerformantEntriesType,
  translatedEntry as translatedEntryType,
  translatedEntryMatchAnyMatcher,
  TranslatedEntryMatcher,
  translatedEntryMatchMatcher,
  TranslatedEntryMatchWildcard,
  TranslatedEntryMatchWildcardMatcher,
  translatedEntryMatchWildcardMatcher,
  TranslatedEntryNestedEntry,
  translatedEntryNestedEntry,
  TranslatedExceptionListItem,
  WrappedTranslatedExceptionList,
  wrappedTranslatedExceptionList,
} from '../../schemas';

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

export type ArtifactListId =
  | typeof ENDPOINT_LIST_ID
  | typeof ENDPOINT_TRUSTED_APPS_LIST_ID
  | typeof ENDPOINT_EVENT_FILTERS_LIST_ID
  | typeof ENDPOINT_HOST_ISOLATION_EXCEPTIONS_LIST_ID
  | typeof ENDPOINT_BLOCKLISTS_LIST_ID;

export async function getFilteredEndpointExceptionList({
  elClient,
  filter,
  listId,
  schemaVersion,
}: {
  elClient: ExceptionListClient;
  filter: string;
  listId: ArtifactListId;
  schemaVersion: string;
}): Promise<WrappedTranslatedExceptionList> {
  const exceptions: WrappedTranslatedExceptionList = { entries: [] };
  let page = 1;
  let paging = true;

  while (paging) {
    const response = await elClient.findExceptionListItem({
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

export async function getEndpointExceptionList({
  elClient,
  listId,
  os,
  policyId,
  schemaVersion,
}: {
  elClient: ExceptionListClient;
  listId?: ArtifactListId;
  os: string;
  policyId?: string;
  schemaVersion: string;
}): Promise<WrappedTranslatedExceptionList> {
  const osFilter = `exception-list-agnostic.attributes.os_types:\"${os}\"`;
  const policyFilter = `(exception-list-agnostic.attributes.tags:\"policy:all\"${
    policyId ? ` or exception-list-agnostic.attributes.tags:\"policy:${policyId}\"` : ''
  })`;

  // for endpoint list
  if (!listId || listId === ENDPOINT_LIST_ID) {
    return getFilteredEndpointExceptionList({
      elClient,
      schemaVersion,
      filter: `${osFilter}`,
      listId: ENDPOINT_LIST_ID,
    });
  }
  // for TAs, EFs, Host IEs and Blocklists
  return getFilteredEndpointExceptionList({
    elClient,
    schemaVersion,
    filter: `${osFilter} and ${policyFilter}`,
    listId,
  });
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

function getMatcherFunction({
  field,
  matchAny,
  os,
}: {
  field: string;
  matchAny?: boolean;
  os: ExceptionListItemSchema['os_types'][number];
}): TranslatedEntryMatcher {
  return matchAny
    ? field.endsWith('.caseless') && os !== 'linux'
      ? 'exact_caseless_any'
      : 'exact_cased_any'
    : field.endsWith('.caseless')
    ? os === 'linux'
      ? 'exact_cased'
      : 'exact_caseless'
    : 'exact_cased';
}

function getMatcherWildcardFunction({
  field,
  os,
}: {
  field: string;
  os: ExceptionListItemSchema['os_types'][number];
}): TranslatedEntryMatchWildcardMatcher {
  return field.endsWith('.caseless') || field.endsWith('.text')
    ? os === 'linux'
      ? 'wildcard_cased'
      : 'wildcard_caseless'
    : 'wildcard_cased';
}

function normalizeFieldName(field: string): string {
  return field.endsWith('.caseless') ? field.substring(0, field.lastIndexOf('.')) : field;
}

function translateItem(
  schemaVersion: string,
  item: ExceptionListItemSchema
): TranslatedExceptionListItem {
  const itemSet = new Set();
  const getEntries = (): TranslatedExceptionListItem['entries'] => {
    return item.entries.reduce<TranslatedEntry[]>((translatedEntries, entry) => {
      const translatedEntry = translateEntry(schemaVersion, entry, item.os_types[0]);

      if (translatedEntry !== undefined) {
        if (translatedEntryType.is(translatedEntry)) {
          const itemHash = createHash('sha256')
            .update(JSON.stringify(translatedEntry))
            .digest('hex');
          if (!itemSet.has(itemHash)) {
            translatedEntries.push(translatedEntry);
            itemSet.add(itemHash);
          }
        }
        if (translatedPerformantEntriesType.is(translatedEntry)) {
          translatedEntry.forEach((tpe) => {
            const itemHash = createHash('sha256').update(JSON.stringify(tpe)).digest('hex');
            if (!itemSet.has(itemHash)) {
              translatedEntries.push(tpe);
              itemSet.add(itemHash);
            }
          });
        }
      }

      return translatedEntries;
    }, []);
  };

  return {
    type: item.type,
    entries: getEntries(),
  };
}

function appendProcessNameEntry({
  wildcardProcessEntry,
  entry,
  os,
}: {
  wildcardProcessEntry: TranslatedEntryMatchWildcard;
  entry: {
    field: string;
    operator: 'excluded' | 'included';
    type: 'wildcard';
    value: string;
  };
  os: ExceptionListItemSchema['os_types'][number];
}): TranslatedPerformantEntries {
  const entries: TranslatedPerformantEntries = [
    wildcardProcessEntry,
    {
      field: normalizeFieldName('process.name'),
      operator: entry.operator,
      type: (os === 'linux' ? 'exact_cased' : 'exact_caseless') as Extract<
        TranslatedEntryMatcher,
        'exact_caseless' | 'exact_cased'
      >,
      value: os === 'windows' ? path.win32.basename(entry.value) : path.posix.basename(entry.value),
    },
  ].reduce<TranslatedPerformantEntries>((p, c) => {
    p.push(c);
    return p;
  }, []);

  return entries;
}

function translateEntry(
  schemaVersion: string,
  entry: Entry | EntryNested,
  os: ExceptionListItemSchema['os_types'][number]
): TranslatedEntry | TranslatedPerformantEntries | undefined {
  switch (entry.type) {
    case 'nested': {
      const nestedEntries = entry.entries.reduce<TranslatedEntryNestedEntry[]>(
        (entries, nestedEntry) => {
          const translatedEntry = translateEntry(schemaVersion, nestedEntry, os);
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
      const matcher = getMatcherFunction({ field: entry.field, os });
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
      const matcher = getMatcherFunction({ field: entry.field, matchAny: true, os });
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
      const wildcardMatcher = getMatcherWildcardFunction({ field: entry.field, os });
      const translatedEntryWildcardMatcher =
        translatedEntryMatchWildcardMatcher.is(wildcardMatcher);

      const buildEntries = () => {
        if (translatedEntryWildcardMatcher) {
          // default process.executable entry
          const wildcardProcessEntry: TranslatedEntryMatchWildcard = {
            field: normalizeFieldName(entry.field),
            operator: entry.operator,
            type: wildcardMatcher,
            value: entry.value,
          };

          const hasExecutableName = hasSimpleExecutableName({
            os: os as OperatingSystem,
            type: entry.type,
            value: entry.value,
          });
          if (hasExecutableName) {
            // when path has a full executable name
            // append a process.name entry based on os
            // `exact_cased` for linux and `exact_caseless` for others
            return appendProcessNameEntry({ entry, os, wildcardProcessEntry });
          } else {
            return wildcardProcessEntry;
          }
        }
      };

      return buildEntries();
    }
  }
}
