/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Observable } from 'rxjs';
import { filter } from 'rxjs/operators';

import { i18n } from '@kbn/i18n';

import { useEffect, useState } from 'react';

import { useObservable, withOptionalSignal } from '@kbn/securitysolution-hook-utils';

import { useAppToasts } from '../../../common/hooks/use_app_toasts';
import { useKibana } from '../../../common/lib/kibana';
import { RISKY_HOSTS_INDEX } from '../../../../common/constants';
import { isIndexNotFoundError } from '../../../common/utils/exceptions';
import { useIsExperimentalFeatureEnabled } from '../../../common/hooks/use_experimental_features';

import {
  DataPublicPluginStart,
  isCompleteResponse,
  isErrorResponse,
} from '../../../../../../../src/plugins/data/public';
import {
  HostsQueries,
  HostRiskScoreRequestOptions,
  HostRiskScoreStrategyResponse,
  HostRiskScore,
} from '../../../../common';

type GetHostRiskScoreProps = HostRiskScoreRequestOptions & {
  data: DataPublicPluginStart;
  signal: AbortSignal;
};

const getHostsRiskScore = ({
  data,
  defaultIndex,
  hostName,
  signal,
}: GetHostRiskScoreProps): Observable<HostRiskScoreStrategyResponse> =>
  data.search.search<HostRiskScoreRequestOptions, HostRiskScoreStrategyResponse>(
    {
      defaultIndex,
      factoryQueryType: HostsQueries.riskScore,
      hostName,
    },
    {
      strategy: 'securitySolutionSearchStrategy',
      abortSignal: signal,
    }
  );

const getHostRiskScoreComplete = (
  props: GetHostRiskScoreProps
): Observable<HostRiskScoreStrategyResponse> => {
  return getHostsRiskScore(props).pipe(
    filter((response) => {
      return isErrorResponse(response) || isCompleteResponse(response);
    })
  );
};

const getHostRiskScoreWithOptionalSignal = withOptionalSignal(getHostRiskScoreComplete);

const useHostRiskScoreComplete = () => useObservable(getHostRiskScoreWithOptionalSignal);

export interface HostRisk {
  loading: boolean;
  isModuleEnabled?: boolean;
  hostRiskScore?: HostRiskScore;
}

export const useHostRiskScore = ({ hostName }: { hostName?: string }): HostRisk | undefined => {
  const riskyHostsFeatureEnabled = useIsExperimentalFeatureEnabled('riskyHostsEnabled');
  const [isModuleEnabled, setIsModuleEnabled] = useState<boolean | undefined>(
    riskyHostsFeatureEnabled ? undefined : false
  );

  const { addError } = useAppToasts();
  const { data } = useKibana().services;

  const { error, loading, result, start } = useHostRiskScoreComplete();

  useEffect(() => {
    if (!loading && result) {
      setIsModuleEnabled(true);
    }
  }, [loading, result, setIsModuleEnabled]);

  useEffect(() => {
    if (error) {
      if (isIndexNotFoundError(error)) {
        setIsModuleEnabled(false);
      } else {
        addError(error, {
          title: i18n.translate('xpack.securitySolution.timelines.hostRiskScore', {
            defaultMessage: 'Error Fetching Host Risk Score',
          }),
        });
        setIsModuleEnabled(true);
      }
    }
  }, [addError, error, setIsModuleEnabled]);

  useEffect(() => {
    if (hostName && riskyHostsFeatureEnabled) {
      start({
        data,
        hostName,
        defaultIndex: [RISKY_HOSTS_INDEX],
      });
    }
  }, [start, data, hostName, riskyHostsFeatureEnabled]);

  const hostRiskScore = result?.hostRiskScore;

  if (!riskyHostsFeatureEnabled || !hostName) {
    return undefined;
  }

  return {
    hostRiskScore,
    isModuleEnabled,
    loading: isModuleEnabled === undefined ? true : loading,
  };
};
