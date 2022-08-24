/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fromKueryExpression } from '@kbn/es-query';
import createContainter from 'constate';
import { fold } from 'fp-ts/lib/Either';
import { constant, identity } from 'fp-ts/lib/function';
import { pipe } from 'fp-ts/lib/pipeable';
import * as rt from 'io-ts';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAlertPrefillContext } from '../../../../alerting/use_alert_prefill';
import { useSourceContext } from '../../../../containers/metrics_source';
import { useDerivedDataView } from '../../../../hooks/use_derived_data_view';
import { convertKueryToElasticSearchQuery } from '../../../../utils/kuery';
import { useUrlState } from '../../../../utils/use_url_state';

const validateKuery = (expression: string) => {
  try {
    fromKueryExpression(expression);
  } catch (err) {
    return false;
  }
  return true;
};

export const DEFAULT_WAFFLE_FILTERS_STATE: WaffleFiltersState = { kind: 'kuery', expression: '' };

export const useWaffleFilters = () => {
  const { source } = useSourceContext();
  const derivedDataView = useDerivedDataView(source?.configuration.metricAlias);

  const [urlState, setUrlState] = useUrlState<WaffleFiltersState>({
    defaultState: DEFAULT_WAFFLE_FILTERS_STATE,
    decodeUrlState,
    encodeUrlState,
    urlStateKey: 'waffleFilter',
  });

  const [state, setState] = useState<WaffleFiltersState>(urlState);

  useEffect(() => setUrlState(state), [setUrlState, state]);

  const [filterQueryDraft, setFilterQueryDraft] = useState<string>(urlState.expression);

  const filterQueryAsJson = useMemo(
    () => convertKueryToElasticSearchQuery(urlState.expression, derivedDataView),
    [derivedDataView, urlState.expression]
  );

  const applyFilterQueryFromKueryExpression = useCallback(
    (expression: string) => {
      setState((previous) => ({
        ...previous,
        kind: 'kuery',
        expression,
      }));
    },
    [setState]
  );

  const applyFilterQuery = useCallback((filterQuery: WaffleFiltersState) => {
    setState(filterQuery);
    setFilterQueryDraft(filterQuery.expression);
  }, []);

  const isFilterQueryDraftValid = useMemo(
    () => validateKuery(filterQueryDraft),
    [filterQueryDraft]
  );

  const { inventoryPrefill } = useAlertPrefillContext();
  const prefillContext = useMemo(() => inventoryPrefill, [inventoryPrefill]); // For Jest compatibility
  useEffect(() => prefillContext.setFilterQuery(state.expression), [prefillContext, state]);

  return {
    filterQuery: urlState,
    filterQueryDraft,
    filterQueryAsJson,
    applyFilterQuery,
    setFilterQueryDraftFromKueryExpression: setFilterQueryDraft,
    applyFilterQueryFromKueryExpression,
    isFilterQueryDraftValid,
    setWaffleFiltersState: applyFilterQuery,
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
export const WaffleFilters = createContainter(useWaffleFilters);
export const [WaffleFiltersProvider, useWaffleFiltersContext] = WaffleFilters;
