/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiPanel, EuiSpacer, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useEffect } from 'react';
import { omit } from 'lodash';
import { useHistory } from 'react-router-dom';
import { usePerformanceContext } from '@kbn/ebt-tools';
import { isOpenTelemetryAgentName, isRumAgentName } from '../../../../common/agent_name';
import { NOT_AVAILABLE_LABEL } from '../../../../common/i18n';
import { useApmServiceContext } from '../../../context/apm_service/use_apm_service_context';
import { useBreadcrumb } from '../../../context/breadcrumbs/use_breadcrumb';
import { useApmParams } from '../../../hooks/use_apm_params';
import { useApmRouter } from '../../../hooks/use_apm_router';
import { useErrorGroupDistributionFetcher } from '../../../hooks/use_error_group_distribution_fetcher';
import { FETCH_STATUS, useFetcher } from '../../../hooks/use_fetcher';
import { useTimeRange } from '../../../hooks/use_time_range';
import type { APIReturnType } from '../../../services/rest/create_call_apm_api';
import { ErrorSampler } from './error_sampler';
import { ErrorDistribution } from './distribution';
import { TopErroneousTransactions } from './top_erroneous_transactions';
import { maybe } from '../../../../common/utils/maybe';
import { fromQuery, toQuery } from '../../shared/links/url_helpers';
import type { AgentName } from '../../../../typings/es_schemas/ui/fields/agent';
import { useApmPluginContext } from '../../../context/apm_plugin/use_apm_plugin_context';

type ErrorSamplesAPIResponse =
  APIReturnType<'GET /internal/apm/services/{serviceName}/errors/{groupId}/samples'>;

const emptyErrorSamples: ErrorSamplesAPIResponse = {
  errorSampleIds: [],
  occurrencesCount: 0,
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
  const { onPageReady } = usePerformanceContext();
  const { observabilityAIAssistant } = useApmPluginContext();

  const {
    path: { groupId },
    query: { rangeFrom, rangeTo, environment, kuery, serviceGroup, comparisonEnabled, errorId },
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

  const { data: errorSamplesData = emptyErrorSamples, status: errorSamplesFetchStatus } =
    useFetcher(
      (callApmApi) => {
        if (start && end) {
          return callApmApi('GET /internal/apm/services/{serviceName}/errors/{groupId}/samples', {
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
          });
        }
      },
      [environment, kuery, serviceName, start, end, groupId]
    );

  const { errorDistributionData, errorDistributionStatus } = useErrorGroupDistributionFetcher({
    serviceName,
    groupId,
    environment,
    kuery,
  });

  useEffect(() => {
    const selectedSample = errorSamplesData?.errorSampleIds.find((sample) => sample === errorId);

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

  useEffect(() => {
    if (
      errorSamplesFetchStatus === FETCH_STATUS.SUCCESS &&
      errorDistributionStatus === FETCH_STATUS.SUCCESS
    ) {
      onPageReady({
        meta: {
          rangeFrom,
          rangeTo,
        },
      });
    }
  }, [onPageReady, errorSamplesFetchStatus, errorDistributionStatus, rangeFrom, rangeTo]);

  const { agentName } = useApmServiceContext();
  const isOpenTelemetryAgent = isOpenTelemetryAgentName(agentName as AgentName);
  const isRumAgent = isRumAgentName(agentName as AgentName);

  // If there are 0 occurrences, show only charts w. empty message
  const showDetails = errorSamplesData.occurrencesCount !== 0;

  useEffect(() => {
    return observabilityAIAssistant?.service.setScreenContext({
      screenDescription: `The user is looking at the error details view. The current error group name is ${groupId}. There have been ${errorSamplesData.occurrencesCount} occurrences in the currently selected time range`,
    });
  }, [observabilityAIAssistant, errorSamplesData.occurrencesCount, groupId]);

  return (
    <>
      <EuiSpacer size={'s'} />

      <ErrorGroupHeader groupId={groupId} occurrencesCount={errorSamplesData?.occurrencesCount} />

      <EuiSpacer size={'m'} />
      <EuiFlexGroup>
        <EuiFlexItem grow={3}>
          <EuiPanel hasBorder={true}>
            <ErrorDistribution
              fetchStatus={errorDistributionStatus}
              distribution={errorDistributionData}
              title={i18n.translate('xpack.apm.errorGroupDetails.occurrencesChartLabel', {
                defaultMessage: 'Error occurrences',
              })}
            />
          </EuiPanel>
        </EuiFlexItem>
        {!isOpenTelemetryAgent && !isRumAgent && (
          <EuiFlexItem grow={2}>
            <EuiPanel hasBorder={true}>
              <TopErroneousTransactions serviceName={serviceName} />
            </EuiPanel>
          </EuiFlexItem>
        )}
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
