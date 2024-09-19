/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { isEmpty, isEqual } from 'lodash';
import usePrevious from 'react-use/lib/usePrevious';

import { EventFields } from '../../../../../common/search_strategy/security_solution/cti';
import {
  DEFAULT_EVENT_ENRICHMENT_FROM,
  DEFAULT_EVENT_ENRICHMENT_TO,
} from '../../../../../common/cti/constants';
import { useAppToasts } from '../../../hooks/use_app_toasts';
import { useKibana } from '../../../lib/kibana';
import { inputsActions } from '../../../store/actions';
import * as i18n from './translations';
import { useEventEnrichmentComplete } from '.';
import { DEFAULT_THREAT_INDEX_KEY } from '../../../../../common/constants';

export const QUERY_ID = 'investigation_time_enrichment';
const noop = () => {};
const noEnrichments = { enrichments: [] };

export const useInvestigationTimeEnrichment = (eventFields: EventFields) => {
  const { addError } = useAppToasts();
  const { data, uiSettings } = useKibana().services;
  const defaultThreatIndices = uiSettings.get<string[]>(DEFAULT_THREAT_INDEX_KEY);

  const dispatch = useDispatch();

  const [range, setRange] = useState({
    from: DEFAULT_EVENT_ENRICHMENT_FROM,
    to: DEFAULT_EVENT_ENRICHMENT_TO,
  });

  const { error, loading, result, start } = useEventEnrichmentComplete();

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
            dsl: result.inspect.dsl,
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
      addError(error, { title: i18n.INVESTIGATION_ENRICHMENT_REQUEST_ERROR });
    }
  }, [addError, error]);

  const prevEventFields = usePrevious(eventFields);
  const prevRange = usePrevious(range);

  useEffect(() => {
    if (
      !isEmpty(eventFields) &&
      (!isEqual(eventFields, prevEventFields) || !isEqual(range, prevRange))
    ) {
      start({
        data,
        timerange: { ...range, interval: '' },
        defaultIndex: defaultThreatIndices,
        eventFields,
        filterQuery: '',
      });
    }
  }, [start, data, eventFields, prevEventFields, range, prevRange, defaultThreatIndices]);

  return {
    result: isEmpty(eventFields) ? noEnrichments : result,
    range,
    setRange,
    loading,
  };
};
