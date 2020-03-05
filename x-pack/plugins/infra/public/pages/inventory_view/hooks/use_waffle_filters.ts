/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useState, useMemo, useCallback } from 'react';
import * as rt from 'io-ts';
import { pipe } from 'fp-ts/lib/pipeable';
import { fold } from 'fp-ts/lib/Either';
import { constant, identity } from 'fp-ts/lib/function';
import { useUrlState } from '../../../utils/use_url_state';
import { useSourceContext } from '../../../containers/source';
import { convertKueryToElasticSearchQuery } from '../../../utils/kuery';
import { esKuery } from '../../../../../../../src/plugins/data/public';

const validateKuery = (expression: string) => {
  try {
    esKuery.fromKueryExpression(expression);
  } catch (err) {
    return false;
  }
  return true;
};

export const useWaffleFilters = () => {
  const { createDerivedIndexPattern } = useSourceContext();
  const indexPattern = createDerivedIndexPattern('metrics');

  const [filterQuery, setFilterQuery] = useUrlState<WaffleFiltersState>({
    defaultState: { kind: 'kuery', expression: '' },
    decodeUrlState,
    encodeUrlState,
    urlStateKey: 'waffleFilter',
  });

  const [filterQueryDraft, setFilterQueryDraft] = useState<string>('');

  const filterQueryAsJson = useMemo(
    () => convertKueryToElasticSearchQuery(filterQuery.expression, indexPattern),
    [filterQuery, indexPattern]
  );

  const applyFilterQueryFromKueryExpression = useCallback(
    (expression: string) => {
      setFilterQuery({
        kind: 'kuery',
        expression,
      });
    },
    [setFilterQuery]
  );

  const isFilterQueryDraftValid = useMemo(() => validateKuery(filterQueryDraft), [
    filterQueryDraft,
  ]);

  return {
    filterQuery,
    filterQueryDraft,
    filterQueryAsJson,
    applyFilterQuery: setFilterQuery,
    setFilterQueryDraftFromKueryExpression: setFilterQueryDraft,
    applyFilterQueryFromKueryExpression,
    isFilterQueryDraftValid,
    setWaffleFiltersState: setFilterQuery,
  };
};

export const WaffleFiltersStateRT = rt.type({
  kind: rt.literal('kuery'),
  expression: rt.string,
});

export type WaffleFiltersState = rt.TypeOf<typeof WaffleFiltersStateRT>;
const encodeUrlState = WaffleFiltersStateRT.encode;
const decodeUrlState = (value: unknown) =>
  pipe(WaffleFiltersStateRT.decode(value), fold(constant(undefined), identity));
