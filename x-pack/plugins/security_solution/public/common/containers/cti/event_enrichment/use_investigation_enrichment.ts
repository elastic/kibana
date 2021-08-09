/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { isEmpty } from 'lodash';

import { EventFields } from '../../../../../common/search_strategy/security_solution/cti';
import {
  DEFAULT_CTI_SOURCE_INDEX,
  DEFAULT_EVENT_ENRICHMENT_FROM,
  DEFAULT_EVENT_ENRICHMENT_TO,
} from '../../../../../common/cti/constants';
import { useAppToasts } from '../../../hooks/use_app_toasts';
import { useKibana } from '../../../lib/kibana';
import { inputsActions } from '../../../store/actions';
import * as i18n from './translations';
import { useEventEnrichmentComplete } from '.';

export const QUERY_ID = 'investigation_time_enrichment';
const noop = () => {};

export const useInvestigationTimeEnrichment = (eventFields: EventFields) => {
  const { addError } = useAppToasts();
  const kibana = useKibana();
  const dispatch = useDispatch();
  const [{ from, to }, setRange] = useState({
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

  useEffect(() => {
    if (!isEmpty(eventFields)) {
      start({
        data: kibana.services.data,
        timerange: { from, to, interval: '' },
        defaultIndex: DEFAULT_CTI_SOURCE_INDEX,
        eventFields,
        filterQuery: '',
      });
    }
  }, [from, start, kibana.services.data, to, eventFields]);

  return {
    loading,
    result,
    setRange,
  };
};
