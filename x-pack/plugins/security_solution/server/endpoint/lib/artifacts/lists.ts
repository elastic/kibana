/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createHash } from 'crypto';

import lzma from 'lzma-native';
import { FoundExceptionListItemSchema } from '../../../../../lists/common/schemas/response/found_exception_list_item_schema';
import { ExceptionListClient } from '../../../../../lists/server';
import {
  TranslatedExceptionList,
  TranslatedEntryNested,
  TranslatedEntryMatch,
  TranslatedEntryMatchAny,
} from '../../schemas';
import { ArtifactConstants } from './common';

export async function buildArtifact(
  exceptionListClient: ExceptionListClient,
  os: string,
  schemaVersion: string
): InternalArtifactSchema {
  const exceptions = await GetFullEndpointExceptionList(exceptionListClient, os, schemaVersion);
  const compressedExceptions: Buffer = await CompressExceptionList(exceptions);

  const sha256 = createHash('sha256')
    .update(compressedExceptions.toString('utf8'), 'utf8')
    .digest('hex');

  return {
    identifier: `${ArtifactConstants.GLOBAL_ALLOWLIST_NAME}-${os}-${schemaVersion}`,
    sha256,
    encoding: 'xz',
    created: Date.now(),
    body: compressedExceptions.toString('binary'),
    size: Buffer.from(JSON.stringify(exceptions)).byteLength,
  };
}

async function GetFullEndpointExceptionList(
  eClient: ExceptionListClient,
  os: string, // TODO: make type
  schemaVersion: string
): Promise<EndpointExceptionList> {
  const exceptions: EndpointExceptionList = { exceptions_list: [] };
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

function translateEntry(schemaVersion: string, entry: ExceptionListItemSchema) {
  const type = entry.type;
  const translatedEntry: TranslatedEntry = {
    field: entry.field,
    type: entry.type,
  };
  if (entry.type === 'nested') {
    translatedEntry.entries = [];
    entry.entries.forEach((nestedEntry) => {
      translatedEntry.entries.push(translateEntry(schemaVersion, nestedEntry));
    });
  } else if (entry.type === 'match') {
    // TODO: sync with pedro, when to use cased/caseless
  } else if (entry.type === 'match_any') {
    // TODO: sync with pedro, when to use cased/caseless
  } else {
    // TODO: log and return
  }
}

/**
 * Translates Exception list items to Exceptions the endpoint can understand
 * @param exc
 */
function translateToEndpointExceptions(
  exc: FoundExceptionListItemSchema,
  schemaVersion: string
): TranslatedExceptionList {
  const translatedList: TranslatedExceptionList = {
    type: exc.type,
    entries: [],
  };

  if (schemaVersion === '1.0.0') {
    // Transform to endpoint format
    exc.data.forEach((list) => {
      list.entries.forEach((entry) => {
        // TODO case sensitive?
        translatedList.entries.push(translateEntry(entry));
      });
    });
  } else {
    throw new Error('unsupported schemaVersion');
  }

  // TODO: validate

  return translatedList;
}

/**
 * Compresses the exception list
 */
function CompressExceptionList(exceptionList: TranslatedExceptionList): Promise<Buffer> {
  return lzma.compress(JSON.stringify(exceptionList), (res: Buffer) => {
    return res;
  });
}
