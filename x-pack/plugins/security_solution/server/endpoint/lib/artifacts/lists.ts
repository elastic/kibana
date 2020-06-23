/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createHash } from 'crypto';

import lzma from 'lzma-native';
import {
  Entry,
  EntryNested,
  EntryMatch,
  EntryMatchAny,
} from '../../../../../lists/common/schemas/types/entries';
import { FoundExceptionListItemSchema } from '../../../../../lists/common/schemas/response/found_exception_list_item_schema';
import { ExceptionListClient } from '../../../../../lists/server';
import {
  TranslatedExceptionList,
  TranslatedEntry,
  TranslatedEntryMatch,
  TranslatedEntryMatchAny,
  TranslatedEntryNested,
  FinalTranslatedExceptionList,
} from '../../schemas';

// export async function buildArtifact(
//   exceptionListClient: ExceptionListClient,
//   os: string,
//   schemaVersion: string
// ): InternalArtifactSchema {
//   const exceptions = await GetFullEndpointExceptionList(exceptionListClient, os, schemaVersion);
//   const compressedExceptions: Buffer = await CompressExceptionList(exceptions);

//   const sha256 = createHash('sha256')
//     .update(compressedExceptions.toString('utf8'), 'utf8')
//     .digest('hex');

//   return {
//     identifier: `${ArtifactConstants.GLOBAL_ALLOWLIST_NAME}-${os}-${schemaVersion}`,
//     sha256,
//     encoding: 'xz',
//     created: Date.now(),
//     body: compressedExceptions.toString('binary'),
//     size: Buffer.from(JSON.stringify(exceptions)).byteLength,
//   };
// }

export async function GetFullEndpointExceptionList(
  eClient: ExceptionListClient,
  os: string, // TODO: make type
  schemaVersion: string
): Promise<FinalTranslatedExceptionList> {
  const exceptions: FinalTranslatedExceptionList = { exceptions_list: [] }; // todo type
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

  return exceptions;
}

/**
 * Translates Exception list items to Exceptions the endpoint can understand
 * @param exc
 */
function translateToEndpointExceptions(
  exc: FoundExceptionListItemSchema,
  schemaVersion: string
): TranslatedEntry[] {
  const translatedList: TranslatedEntry[] = [];

  if (schemaVersion === '1.0.0') {
    // Transform to endpoint format
    exc.data.forEach((list) => {
      list.entries.forEach((entry) => {
        // TODO case sensitive?
        translatedList.push(translateEntry(schemaVersion, entry));
      });
    });
  } else {
    throw new Error('unsupported schemaVersion');
  }

  // TODO: validate

  return translatedList;
}

function translateEntry(schemaVersion: string, entry: Entry | EntryNested): TranslatedEntry {
  let translatedEntry: TranslatedEntry;
  if (entry.type === 'nested') {
    const e = (entry as unknown) as EntryNested;
    const nestedEntries: TranslatedEntry[] = [];
    e.entries.forEach((nestedEntry) => {
      nestedEntries.push(translateEntry(schemaVersion, nestedEntry));
    });
    translatedEntry = {
      entries: nestedEntries,
      field: e.field,
      type: 'nested',
    } as TranslatedEntryNested;
  } else if (entry.type === 'match') {
    const e = (entry as unknown) as EntryMatch;
    translatedEntry = {
      field: e.field,
      operator: e.operator,
      type: 'exact_cased', // todo
      value: e.value,
    } as TranslatedEntryMatch;
  } else if (entry.type === 'match_any') {
    const e = (entry as unknown) as EntryMatchAny;
    translatedEntry = {
      field: e.field,
      operator: e.operator,
      type: 'exact_cased_any', // todo
      value: e.value,
    } as TranslatedEntryMatchAny;
  } else {
    throw new Error();
  }
  return translatedEntry;
}

/**
 * Compresses the exception list
 */
function CompressExceptionList(exceptionList: TranslatedExceptionList): Promise<Buffer> {
  return lzma.compress(JSON.stringify(exceptionList), (res: Buffer) => {
    return res;
  });
}
