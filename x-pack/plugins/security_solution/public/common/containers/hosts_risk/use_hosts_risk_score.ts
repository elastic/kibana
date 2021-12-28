/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';

import { useCallback, useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';

import { useAppToasts } from '../../hooks/use_app_toasts';
import { useKibana } from '../../lib/kibana';
import { inputsActions } from '../../store/actions';
import { isIndexNotFoundError } from '../../utils/exceptions';
import { getHostRiskIndex, HostsRiskScore } from '../../../../common/search_strategy';

import { useHostsRiskScoreComplete } from './use_hosts_risk_score_complete';
import { useIsExperimentalFeatureEnabled } from '../../hooks/use_experimental_features';
import { ESTermQuery } from '../../../../common/typed_json';

export const QUERY_ID = 'host_risk_score';
const noop = () => {};

const isRecord = (item: unknown): item is Record<string, unknown> =>
  typeof item === 'object' && !!item;

const isHostsRiskScoreHit = (item: Partial<HostsRiskScore>): item is HostsRiskScore =>
  isRecord(item) &&
  isRecord(item.host) &&
  typeof item.host.name === 'string' &&
  typeof item.risk_stats?.risk_score === 'number' &&
  typeof item.risk === 'string';

export interface HostRisk {
  loading: boolean;
  isModuleEnabled?: boolean;
  result?: HostsRiskScore[];
}

export const useHostsRiskScore = ({
  timerange,
  hostName,
  onlyLatest = true,
  filterQuery,
}: {
  timerange?: { to: string; from: string };
  filterQuery?: ESTermQuery | string;
  hostName?: string;
  onlyLatest?: boolean;
}): HostRisk | null => {
  const riskyHostsFeatureEnabled = useIsExperimentalFeatureEnabled('riskyHostsEnabled');
  const [isModuleEnabled, setIsModuleEnabled] = useState<boolean | undefined>(undefined);
  const [loading, setLoading] = useState<boolean>(riskyHostsFeatureEnabled);

  const { addError } = useAppToasts();
  const { data, spaces } = useKibana().services;

  const dispatch = useDispatch();

  const { error, result, start, loading: isHostsRiskScoreLoading } = useHostsRiskScoreComplete();

  const deleteQuery = useCallback(() => {
    dispatch(inputsActions.deleteOneQuery({ inputId: 'global', id: QUERY_ID }));
  }, [dispatch]);

  useEffect(() => {
    if (!isHostsRiskScoreLoading && result) {
      setIsModuleEnabled(true);
      setLoading(false);
      dispatch(
        inputsActions.setQuery({
          inputId: 'global',
          id: QUERY_ID,
          inspect: {
            dsl: result.inspect?.dsl ?? [],
            response: [JSON.stringify(result.rawResponse, null, 2)],
          },
          loading: isHostsRiskScoreLoading,
          refetch: noop,
        })
      );
    }
    return deleteQuery;
  }, [deleteQuery, dispatch, isHostsRiskScoreLoading, result, setIsModuleEnabled]);

  useEffect(() => {
    if (error) {
      if (isIndexNotFoundError(error)) {
        setIsModuleEnabled(false);
        setLoading(false);
      } else {
        addError(error, {
          title: i18n.translate('xpack.securitySolution.overview.hostsRiskError', {
            defaultMessage: 'Error Fetching Hosts Risk',
          }),
        });
        setLoading(false);
        setIsModuleEnabled(true);
      }
    }
  }, [addError, error, setIsModuleEnabled]);

  useEffect(() => {
    if (riskyHostsFeatureEnabled && (hostName || timerange)) {
      spaces?.getActiveSpace().then((space) => {
        start({
          data,
          timerange: timerange
            ? { to: timerange.to, from: timerange.from, interval: '' }
            : undefined,
          filterQuery,
          hostNames: hostName ? [hostName] : undefined,
          defaultIndex: [getHostRiskIndex(space.id, onlyLatest)],
          onlyLatest,
        });
      });
    }
  }, [start, data, timerange, filterQuery, hostName, onlyLatest, riskyHostsFeatureEnabled, spaces]);

  if ((!hostName && !timerange) || !riskyHostsFeatureEnabled) {
    return null;
  }

  const hits = result?.rawResponse?.hits?.hits;

  return {
    result: isHostsRiskScoreHit(hits?.[0]?._source)
      ? (hits?.map((hit) => hit._source) as HostsRiskScore[])
      : [],
    isModuleEnabled,
    loading,
  };
};
