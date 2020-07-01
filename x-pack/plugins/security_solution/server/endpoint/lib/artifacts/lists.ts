/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createHash } from 'crypto';
import { validate } from '../../../../common/validate';

import {
  Entry,
  EntryNested,
  EntryMatch,
  EntryMatchAny,
} from '../../../../../lists/common/schemas/types/entries';
import { FoundExceptionListItemSchema } from '../../../../../lists/common/schemas/response/found_exception_list_item_schema';
import { ExceptionListClient } from '../../../../../lists/server';
import {
  InternalArtifactSchema,
  TranslatedEntry,
  TranslatedEntryMatch,
  TranslatedEntryMatchAny,
  TranslatedEntryNested,
  WrappedTranslatedExceptionList,
  wrappedExceptionList,
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
  const translatedList: TranslatedEntry[] = [];

  if (schemaVersion === '1.0.0') {
    exc.data.forEach((list) => {
      list.entries.forEach((entry) => {
        const tEntry = translateEntry(schemaVersion, entry);
        if (tEntry !== undefined) {
          translatedList.push(tEntry);
        }
      });
    });
  } else {
    throw new Error('unsupported schemaVersion');
  }
  return translatedList;
}

function translateEntry(
  schemaVersion: string,
  entry: Entry | EntryNested
): TranslatedEntry | undefined {
  let translatedEntry;
  switch (entry.type) {
    case 'nested': {
      const e = (entry as unknown) as EntryNested;
      const nestedEntries: TranslatedEntry[] = [];
      for (const nestedEntry of e.entries) {
        const translation = translateEntry(schemaVersion, nestedEntry);
        if (translation !== undefined) {
          nestedEntries.push(translation);
        }
      }
      translatedEntry = {
        entries: nestedEntries,
        field: e.field,
        type: 'nested',
      } as TranslatedEntryNested;
      break;
    }
    case 'match': {
      const e = (entry as unknown) as EntryMatch;
      translatedEntry = {
        field: e.field,
        operator: e.operator,
        type: e.field.endsWith('.text') ? 'exact_caseless' : 'exact_cased',
        value: e.value,
      } as TranslatedEntryMatch;
      break;
    }
    case 'match_any':
      {
        const e = (entry as unknown) as EntryMatchAny;
        translatedEntry = {
          field: e.field,
          operator: e.operator,
          type: e.field.endsWith('.text') ? 'exact_caseless_any' : 'exact_cased_any',
          value: e.value,
        } as TranslatedEntryMatchAny;
      }
      break;
  }
  return translatedEntry || undefined;
}
