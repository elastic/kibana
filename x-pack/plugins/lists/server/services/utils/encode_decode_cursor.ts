/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';
import { fold } from 'fp-ts/lib/Either';
import { pipe } from 'fp-ts/lib/pipeable';

import { CursorOrUndefined, SortFieldOrUndefined } from '../../../common/schemas';
import { exactCheck } from '../../../common/siem_common_deps';

/**
 * Used only internally for this ad-hoc opaque cursor structure to keep track of the
 * current page_index that the search_after is currently on. The format of an array
 * is to be consistent with other compact forms of opaque nature such as a saved object versioning.
 *
 * The format is [index of item, search_after_array]
 */

// TODO: Use PositiveInteger from siem once that type is outside of server and in common
export const contextCursor = t.tuple([t.number, t.union([t.array(t.string), t.undefined])]);

export type ContextCursor = t.TypeOf<typeof contextCursor>;

export interface EncodeCursorOptions {
  searchAfter: string[] | undefined;
  page: number;
  perPage: number;
}

export const encodeCursor = ({ searchAfter, page, perPage }: EncodeCursorOptions): string => {
  const index = searchAfter != null ? page * perPage : 0;
  const encodedCursor = searchAfter != null ? [index, searchAfter] : [index];
  const scrollStringed = JSON.stringify(encodedCursor);
  return Buffer.from(scrollStringed).toString('base64');
};

export interface DecodeCursorOptions {
  cursor: CursorOrUndefined;
  page: number;
  perPage: number;
  sortField: SortFieldOrUndefined;
}

export interface DecodeCursor {
  cursor: ContextCursor;
  isValid: boolean;
  errorMessage: string;
}

export const decodeCursor = ({
  cursor,
  page,
  perPage,
  sortField,
}: DecodeCursorOptions): DecodeCursor => {
  if (cursor == null) {
    return {
      cursor: [0, undefined],
      errorMessage: '',
      isValid: true,
    };
  } else {
    const fromBuffer = Buffer.from(cursor, 'base64').toString();
    const parsed = parseOrUndefined(fromBuffer);
    if (parsed == null) {
      return {
        cursor: [0, undefined],
        errorMessage: 'Error parsing JSON from base64 encoded cursor',
        isValid: false,
      };
    } else {
      const decodedCursor = contextCursor.decode(parsed);
      const checked = exactCheck(parsed, decodedCursor);

      const onLeft = (): ContextCursor | undefined => undefined;
      const onRight = (schema: ContextCursor): ContextCursor | undefined => schema;
      const cursorOrUndefined = pipe(checked, fold(onLeft, onRight));

      const startPageIndex = (page - 1) * perPage;
      if (cursorOrUndefined == null) {
        return {
          cursor: [0, undefined],
          errorMessage: 'Error decoding cursor structure',
          isValid: false,
        };
      } else {
        const [index, searchAfter] = cursorOrUndefined;
        if (index < 0) {
          return {
            cursor: [0, undefined],
            errorMessage: 'index of cursor cannot be less 0',
            isValid: false,
          };
        } else if (index > startPageIndex) {
          return {
            cursor: [0, undefined],
            errorMessage: `index: ${index} of cursor cannot be greater than the start page index: ${startPageIndex}`,
            isValid: false,
          };
        } else if (searchAfter != null && searchAfter.length > 1 && sortField == null) {
          return {
            cursor: [0, undefined],
            errorMessage: '',
            isValid: false,
          };
        } else {
          return {
            cursor: [index, searchAfter != null ? searchAfter : undefined],
            errorMessage: '',
            isValid: true,
          };
        }
      }
    }
  }
};

export const parseOrUndefined = (input: string): ContextCursor | undefined => {
  try {
    return JSON.parse(input);
  } catch (err) {
    return undefined;
  }
};
