/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';

import { useAppToasts } from '../../../hooks/use_app_toasts';
import { useKibana } from '../../../lib/kibana';
import { useEventEnrichment } from '.';
import { inputsActions } from '../../../store/actions';

export const QUERY_ID = 'investigation_time_enrichment';
const noop = () => {};

export const useInvestigationTimeEnrichment = () => {
  const { addError } = useAppToasts();
  const kibana = useKibana();
  const dispatch = useDispatch();
  const [{ from, to }, setRange] = useState({ from: 'now-30d', to: 'now' });
  const { error, loading, result, start } = useEventEnrichment();

  const deleteQuery = useCallback(() => {
    dispatch(inputsActions.deleteOneQuery({ inputId: 'global', id: QUERY_ID }));
  }, [dispatch]);

  useEffect(() => {
    if (!loading && result) {
      dispatch(
        inputsActions.setQuery({
          inputId: 'global',
          id: QUERY_ID,
          inspect: {
            dsl: result.inspect?.dsl ?? [],
            response: [JSON.stringify(result.rawResponse, null, 2)],
          },
          loading,
          refetch: noop,
        })
      );
    }

    return deleteQuery;
  }, [deleteQuery, dispatch, loading, result]);

  useEffect(() => {
    if (error) {
      addError(error, { title: 'TODO' });
    }
  }, [addError, error]);

  useEffect(() => {
    start({
      data: kibana.services.data,
      timerange: { from, to, interval: '' },
      defaultIndex: ['filebeat-*'], // TODO do we apply the current sources here?
      eventFields: {
        'source.ip': '192.168.1.19', // TODO get event values
      },
      filterQuery: '', // TODO do we apply the current filters here?
    });
  }, [from, start, kibana.services.data, to]);

  return {
    loading,
    result,
    setRange,
  };
};
