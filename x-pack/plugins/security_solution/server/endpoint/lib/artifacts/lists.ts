/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createHash } from 'crypto';
import { validate } from '../../../../common/validate';

import { Entry, EntryNested } from '../../../../../lists/common/schemas/types/entries';
import { FoundExceptionListItemSchema } from '../../../../../lists/common/schemas/response/found_exception_list_item_schema';
import { ExceptionListClient } from '../../../../../lists/server';
import {
  InternalArtifactSchema,
  TranslatedEntry,
  WrappedTranslatedExceptionList,
  wrappedExceptionList,
  TranslatedEntryNestedEntry,
  translatedEntryNestedEntry,
  translatedEntry,
  TranslatedEntryMatcher,
  translatedEntryMatchMatcher,
  translatedEntryMatchAnyMatcher,
} from '../../schemas';
import { ArtifactConstants } from './common';

export async function buildArtifact(
  exceptions: WrappedTranslatedExceptionList,
  os: string,
  schemaVersion: string
): Promise<InternalArtifactSchema> {
  const exceptionsBuffer = Buffer.from(JSON.stringify(exceptions));
  const sha256 = createHash('sha256').update(exceptionsBuffer.toString()).digest('hex');

  return {
    identifier: `${ArtifactConstants.GLOBAL_ALLOWLIST_NAME}-${os}-${schemaVersion}`,
    sha256,
    encoding: 'application/json',
    created: Date.now(),
    body: exceptionsBuffer.toString('base64'),
    size: exceptionsBuffer.byteLength,
  };
}

export async function getFullEndpointExceptionList(
  eClient: ExceptionListClient,
  os: string,
  schemaVersion: string
): Promise<WrappedTranslatedExceptionList> {
  const exceptions: WrappedTranslatedExceptionList = { exceptions_list: [] };
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

      exceptions.exceptions_list = exceptions.exceptions_list.concat(
        translateToEndpointExceptions(response, schemaVersion)
      );

      page++;
    } else {
      break;
    }
  } while (numResponses > 0);

  const [validated, errors] = validate(exceptions, wrappedExceptionList);
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
): TranslatedEntry[] {
  if (schemaVersion === '1.0.0') {
    return exc.data
      .map(
        (list): Array<TranslatedEntry | undefined> => {
          return list.entries.map((entry: Entry | EntryNested): TranslatedEntry | undefined => {
            return translateEntry(schemaVersion, entry);
          });
        }
      )
      .reduce((acc, it) => [...acc, ...it], [])
      .filter((entry: TranslatedEntry | undefined): entry is TranslatedEntry => {
        return entry !== undefined && translatedEntry.is(entry);
      });
  } else {
    throw new Error('unsupported schemaVersion');
  }
}

function getMatcherFunction(field: string, any?: boolean): TranslatedEntryMatcher {
  return any
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

function translateEntry(
  schemaVersion: string,
  entry: Entry | EntryNested
): TranslatedEntry | undefined {
  switch (entry.type) {
    case 'nested': {
      const nestedEntries = entry.entries
        .map((nestedEntry): TranslatedEntry | undefined => {
          return translateEntry(schemaVersion, nestedEntry);
        })
        .filter(
          (nestedEntry: TranslatedEntry | undefined): nestedEntry is TranslatedEntryNestedEntry => {
            return nestedEntry !== undefined && translatedEntryNestedEntry.is(nestedEntry);
          }
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
