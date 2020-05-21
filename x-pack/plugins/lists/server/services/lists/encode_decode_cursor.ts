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

  const encodedCursor: ContextCursor = [index, searchAfter];
  const scrollStringed = JSON.stringify(encodedCursor);
  return Buffer.from(scrollStringed).toString('base64');
};

export interface DecodeCursorOptions {
  cursor: CursorOrUndefined;
  page: number;
  perPage: number;
  sortField: SortFieldOrUndefined;
}

export const decodeCursor = ({
  cursor,
  page,
  perPage,
  sortField,
}: DecodeCursorOptions): ContextCursor | undefined => {
  if (cursor == null) {
    return [0, undefined];
  } else {
    const fromBuffer = Buffer.from(cursor, 'base64').toString('ascii');
    const parsed = parseOrUndefined(fromBuffer);
    if (parsed == null) {
      return undefined;
    } else {
      const decodedCursor = contextCursor.decode(parsed);
      const checked = exactCheck(parsed, decodedCursor);

      const onLeft = (): ContextCursor | undefined => undefined;
      const onRight = (schema: ContextCursor): ContextCursor | undefined => schema;
      const cursorOrUndefined = pipe(checked, fold(onLeft, onRight));

      const startPageIndex = (page - 1) * perPage;
      if (cursorOrUndefined == null) {
        return undefined;
      } else {
        const [index, searchAfter] = cursorOrUndefined;
        if (
          searchAfter == null ||
          index > startPageIndex ||
          index < 0 ||
          (searchAfter.length > 1 && sortField == null)
        ) {
          return undefined;
        } else {
          return cursorOrUndefined;
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
