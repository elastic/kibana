/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiTitle,
  EuiLoadingSpinner,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useEffect } from 'react';
import { omit } from 'lodash';
import { useHistory } from 'react-router-dom';
import { NOT_AVAILABLE_LABEL } from '../../../../common/i18n';
import { useApmServiceContext } from '../../../context/apm_service/use_apm_service_context';
import { useBreadcrumb } from '../../../context/breadcrumbs/use_breadcrumb';
import { useApmParams } from '../../../hooks/use_apm_params';
import { useApmRouter } from '../../../hooks/use_apm_router';
import { useErrorGroupDistributionFetcher } from '../../../hooks/use_error_group_distribution_fetcher';
import {
  FETCH_STATUS,
  isPending,
  useFetcher,
} from '../../../hooks/use_fetcher';
import { useTimeRange } from '../../../hooks/use_time_range';
import type { APIReturnType } from '../../../services/rest/create_call_apm_api';
import { ErrorSampler } from './error_sampler';
import { ErrorDistribution } from './distribution';
import { TopErroneousTransactions } from './top_erroneous_transactions';
import { maybe } from '../../../../common/utils/maybe';
import { fromQuery, toQuery } from '../../shared/links/url_helpers';

type ErrorDistributionAPIResponse =
  APIReturnType<'GET /internal/apm/services/{serviceName}/errors/distribution'>;

const emptyState: ErrorDistributionAPIResponse = {
  currentPeriod: [],
  previousPeriod: [],
  bucketSize: 0,
};

function getShortGroupId(errorGroupId?: string) {
  if (!errorGroupId) {
    return NOT_AVAILABLE_LABEL;
  }

  return errorGroupId.slice(0, 5);
}

function ErrorGroupHeader({
  groupId,
  occurrencesCount,
}: {
  groupId: string;
  occurrencesCount?: number;
}) {
  return (
    <EuiFlexGroup alignItems="center">
      <EuiFlexItem grow={false}>
        <EuiTitle>
          <h2>
            {i18n.translate('xpack.apm.errorGroupDetails.errorGroupTitle', {
              defaultMessage: 'Error group {errorGroupId}',
              values: {
                errorGroupId: getShortGroupId(groupId),
              },
            })}
          </h2>
        </EuiTitle>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiBadge color="hollow">
          {i18n.translate('xpack.apm.errorGroupDetails.occurrencesLabel', {
            defaultMessage: '{occurrencesCount} occ',
            values: { occurrencesCount },
          })}
        </EuiBadge>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

export function ErrorGroupDetails() {
  const { serviceName } = useApmServiceContext();

  const apmRouter = useApmRouter();
  const history = useHistory();

  const {
    path: { groupId },
    query: {
      rangeFrom,
      rangeTo,
      environment,
      kuery,
      serviceGroup,
      comparisonEnabled,
      errorId,
    },
  } = useApmParams('/services/{serviceName}/errors/{groupId}');

  const { start, end } = useTimeRange({ rangeFrom, rangeTo });

  useBreadcrumb(
    () => ({
      title: groupId,
      href: apmRouter.link('/services/{serviceName}/errors/{groupId}', {
        path: {
          serviceName,
          groupId,
        },
        query: {
          rangeFrom,
          rangeTo,
          environment,
          kuery,
          serviceGroup,
          comparisonEnabled,
        },
      }),
    }),
    [
      apmRouter,
      comparisonEnabled,
      environment,
      groupId,
      kuery,
      rangeFrom,
      rangeTo,
      serviceGroup,
      serviceName,
    ]
  );

  const { data: errorSamplesData, status: errorSamplesFetchStatus } =
    useFetcher(
      (callApmApi) => {
        if (start && end) {
          return callApmApi(
            'GET /internal/apm/services/{serviceName}/errors/{groupId}/samples',
            {
              params: {
                path: {
                  serviceName,
                  groupId,
                },
                query: {
                  environment,
                  kuery,
                  start,
                  end,
                },
              },
            }
          );
        }
      },
      [environment, kuery, serviceName, start, end, groupId]
    );

  const { errorDistributionData, status: errorDistributionStatus } =
    useErrorGroupDistributionFetcher({
      serviceName,
      groupId,
      environment,
      kuery,
    });

  useEffect(() => {
    const selectedSample = errorSamplesData?.errorSampleIds.find(
      (sample) => sample === errorId
    );

    if (errorSamplesFetchStatus === FETCH_STATUS.SUCCESS && !selectedSample) {
      // selected sample was not found. select a new one:
      const selectedErrorId = maybe(errorSamplesData?.errorSampleIds[0]);

      history.replace({
        ...history.location,
        search: fromQuery({
          ...omit(toQuery(history.location.search), ['errorId']),
          errorId: selectedErrorId,
        }),
      });
    }
  }, [history, errorId, errorSamplesData, errorSamplesFetchStatus]);

  const loadingDistributionData = isPending(errorDistributionStatus);
  const loadingErrorSamplesData = isPending(errorSamplesFetchStatus);

  if (loadingDistributionData && loadingErrorSamplesData) {
    return (
      <div style={{ textAlign: 'center' }}>
        <EuiLoadingSpinner size="xl" />
      </div>
    );
  }

  if (!errorDistributionData || !errorSamplesData) {
    return <ErrorGroupHeader groupId={groupId} />;
  }

  // If there are 0 occurrences, show only charts w. empty message
  const showDetails = errorSamplesData.occurrencesCount !== 0;

  return (
    <>
      <EuiSpacer size={'s'} />

      <ErrorGroupHeader
        groupId={groupId}
        occurrencesCount={errorSamplesData.occurrencesCount}
      />

      <EuiSpacer size={'m'} />
      <EuiFlexGroup>
        <EuiFlexItem grow={3}>
          <EuiPanel hasBorder={true}>
            <ErrorDistribution
              fetchStatus={errorDistributionStatus}
              distribution={showDetails ? errorDistributionData : emptyState}
              title={i18n.translate(
                'xpack.apm.errorGroupDetails.occurrencesChartLabel',
                {
                  defaultMessage: 'Error occurrences',
                }
              )}
            />
          </EuiPanel>
        </EuiFlexItem>
        <EuiFlexItem grow={2}>
          <EuiPanel hasBorder={true}>
            <TopErroneousTransactions serviceName={serviceName} />
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      {showDetails && (
        <ErrorSampler
          errorSampleIds={errorSamplesData.errorSampleIds}
          errorSamplesFetchStatus={errorSamplesFetchStatus}
          occurrencesCount={errorSamplesData.occurrencesCount}
        />
      )}
    </>
  );
}
