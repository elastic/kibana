/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';

import { useCallback, useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';

import { useRiskyHostsComplete } from './use_risky_hosts';
import { useAppToasts } from '../../../common/hooks/use_app_toasts';
import { useKibana } from '../../../common/lib/kibana';
import { inputsActions } from '../../../common/store/actions';
import { LinkPanelListItem } from '../../components/link_panel';

export const QUERY_ID = 'risky_hosts';
const noop = () => {};

export interface RiskyHost {
  host: {
    name: string;
  };
  risk_score: number;
  risk: string;
}

/* eslint-disable-next-line  @typescript-eslint/no-explicit-any */
const isRiskyHostHit = (item: any): item is RiskyHost =>
  item &&
  item.host &&
  typeof item.host.name === 'string' &&
  typeof item.risk_score === 'number' &&
  typeof item.risk === 'string';

const getListItemsFromHits = (items: RiskyHost[]): LinkPanelListItem[] => {
  return items.map(({ host, risk_score: count, risk: copy }) => ({
    title: host.name,
    count,
    copy,
    path: '',
  }));
};

export const useRiskyHostLinks = ({ to, from }: { to: string; from: string }) => {
  const [isModuleEnabled, setIsModuleEnabled] = useState<boolean | undefined>(undefined);

  const { addError } = useAppToasts();
  const { data } = useKibana().services;

  const dispatch = useDispatch();

  const { error, loading, result, start } = useRiskyHostsComplete();

  const deleteQuery = useCallback(() => {
    dispatch(inputsActions.deleteOneQuery({ inputId: 'global', id: QUERY_ID }));
  }, [dispatch]);

  useEffect(() => {
    if (!loading && result) {
      setIsModuleEnabled(true);
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
  }, [deleteQuery, dispatch, loading, result, setIsModuleEnabled]);

  useEffect(() => {
    if (error) {
      if (
        (error as { attributes?: { caused_by?: { type?: string } } }).attributes?.caused_by
          ?.type === 'index_not_found_exception'
      ) {
        setIsModuleEnabled(false);
      } else {
        addError(error, {
          title: i18n.translate('xpack.securitySolution.overview.riskyHostsError', {
            defaultMessage: 'Error Fetching Risky Hosts',
          }),
        });
        setIsModuleEnabled(true);
      }
    }
  }, [addError, error, setIsModuleEnabled]);

  useEffect(() => {
    start({
      data,
      timerange: { to, from, interval: '' },
      defaultIndex: ['ml_host_risk_score_latest'],
      filterQuery: '',
    });
  }, [start, data, to, from]);

  return {
    listItems: isRiskyHostHit(result?.rawResponse?.hits?.hits?.[0]?._source)
      ? getListItemsFromHits(
          result?.rawResponse?.hits?.hits?.map((hit) => hit._source) as RiskyHost[]
        )
      : [],
    isModuleEnabled,
    loading,
  };
};
