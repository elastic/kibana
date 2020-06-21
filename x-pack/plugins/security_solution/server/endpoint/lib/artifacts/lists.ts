/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import lzma from 'lzma-native';
import { FoundExceptionListItemSchema } from '../../../../../lists/common/schemas/response/found_exception_list_item_schema';
import { ExceptionListClient } from '../../../../../lists/server';

export interface EndpointExceptionList {
  exceptions_list: ExceptionsList[];
}

export interface ExceptionsList {
  type: string;
  entries: EntryElement[];
}

export interface EntryElement {
  field: string;
  operator: string;
  entry: EntryEntry;
}

export interface EntryEntry {
  exact_caseless?: string;
  exact_caseless_any?: string[];
}

export async function GetFullEndpointExceptionList(
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

/**
 * Translates Exception list items to Exceptions the endpoint can understand
 * @param exc
 */
export function translateToEndpointExceptions(
  exc: FoundExceptionListItemSchema,
  schemaVersion: string
): ExceptionsList[] {
  const translated: ExceptionsList[] = [];

  if (schemaVersion === '1.0.0') {
    // Transform to endpoint format
    exc.data.forEach((item) => {
      const endpointItem: ExceptionsList = {
        type: item.type,
        entries: [],
      };
      item.entries.forEach((entry) => {
        // TODO case sensitive?
        const e: EntryEntry = {};
        if (entry.match) {
          e.exact_caseless = entry.match;
        }

        if (entry.match_any) {
          e.exact_caseless_any = entry.match_any;
        }

        endpointItem.entries.push({
          field: entry.field,
          operator: entry.operator,
          entry: e,
        });
      });
      translated.push(endpointItem);
    });
  } else {
    throw new Error('unsupported schemaVersion');
  }
  return translated;
}

/**
 * Compresses the exception list
 */
export function CompressExceptionList(exceptionList: EndpointExceptionList): Promise<Buffer> {
  return lzma.compress(JSON.stringify(exceptionList), (res: Buffer) => {
    return res;
  });
}
