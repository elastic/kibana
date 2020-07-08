/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';
import { operator } from '../../../../../lists/common/schemas';

export const translatedEntryMatchAny = t.exact(
  t.type({
    field: t.string,
    operator,
    type: t.keyof({
      exact_cased_any: null,
      exact_caseless_any: null,
    }),
    value: t.array(t.string),
  })
);
export type TranslatedEntryMatchAny = t.TypeOf<typeof translatedEntryMatchAny>;

export const translatedEntryMatchAnyMatcher = translatedEntryMatchAny.type.props.type;
export type TranslatedEntryMatchAnyMatcher = t.TypeOf<typeof translatedEntryMatchAnyMatcher>;

export const translatedEntryMatch = t.exact(
  t.type({
    field: t.string,
    operator,
    type: t.keyof({
      exact_cased: null,
      exact_caseless: null,
    }),
    value: t.string,
  })
);
export type TranslatedEntryMatch = t.TypeOf<typeof translatedEntryMatch>;

export const translatedEntryMatchMatcher = translatedEntryMatch.type.props.type;
export type TranslatedEntryMatchMatcher = t.TypeOf<typeof translatedEntryMatchMatcher>;

export const translatedEntryMatcher = t.union([
  translatedEntryMatchMatcher,
  translatedEntryMatchAnyMatcher,
]);
export type TranslatedEntryMatcher = t.TypeOf<typeof translatedEntryMatcher>;

export const translatedEntryNestedEntry = t.union([translatedEntryMatch, translatedEntryMatchAny]);
export type TranslatedEntryNestedEntry = t.TypeOf<typeof translatedEntryNestedEntry>;

export const translatedEntryNested = t.exact(
  t.type({
    field: t.string,
    type: t.keyof({ nested: null }),
    entries: t.array(translatedEntryNestedEntry),
  })
);
export type TranslatedEntryNested = t.TypeOf<typeof translatedEntryNested>;

export const translatedEntry = t.union([
  translatedEntryNested,
  translatedEntryMatch,
  translatedEntryMatchAny,
]);
export type TranslatedEntry = t.TypeOf<typeof translatedEntry>;

export const translatedExceptionListItem = t.exact(
  t.type({
    type: t.string,
    entries: t.array(translatedEntry),
  })
);
export type TranslatedExceptionListItem = t.TypeOf<typeof translatedExceptionListItem>;

export const wrappedTranslatedExceptionList = t.exact(
  t.type({
    entries: t.array(translatedExceptionListItem),
  })
);
export type WrappedTranslatedExceptionList = t.TypeOf<typeof wrappedTranslatedExceptionList>;
