/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useEffect } from 'react';
import { omit } from 'lodash';
import { useHistory } from 'react-router-dom';
import { NOT_AVAILABLE_LABEL } from '../../../../../../common/i18n';
import { useApmServiceContext } from '../../../../../context/apm_service/use_apm_service_context';
import { useBreadcrumb } from '../../../../../context/breadcrumbs/use_breadcrumb';
import { useApmParams } from '../../../../../hooks/use_apm_params';
import { useApmRouter } from '../../../../../hooks/use_apm_router';
import { useCrashGroupDistributionFetcher } from '../../../../../hooks/use_crash_group_distribution_fetcher';
import { FETCH_STATUS, useFetcher } from '../../../../../hooks/use_fetcher';
import { useTimeRange } from '../../../../../hooks/use_time_range';
import type { APIReturnType } from '../../../../../services/rest/create_call_apm_api';
import { ErrorSampler } from '../../../error_group_details/error_sampler';
import { ErrorDistribution } from '../shared/distribution';
import { ChartPointerEventContextProvider } from '../../../../../context/chart_pointer_event/chart_pointer_event_context';
import { MobileErrorsAndCrashesTreemap } from '../../charts/mobile_errors_and_crashes_treemap';
import { maybe } from '../../../../../../common/utils/maybe';
import { fromQuery, toQuery } from '../../../../shared/links/url_helpers';
import {
  getKueryWithMobileCrashFilter,
  getKueryWithMobileFilters,
} from '../../../../../../common/utils/get_kuery_with_mobile_filters';

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

function CrashGroupHeader({
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
            {i18n.translate('xpack.apm.CrashGroupDetails.CrashGroupTitle', {
              defaultMessage: 'Crash group {errorGroupId}',
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

export function CrashGroupDetails() {
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
      device,
      osVersion,
      appVersion,
      netConnectionType,
    },
  } = useApmParams('/mobile-services/{serviceName}/errors-and-crashes/crashes/{groupId}');

  const kueryWithMobileFilters = getKueryWithMobileFilters({
    device,
    osVersion,
    appVersion,
    netConnectionType,
    kuery,
  });
  const { start, end } = useTimeRange({ rangeFrom, rangeTo });

  useBreadcrumb(
    () => ({
      title: groupId,
      href: apmRouter.link('/mobile-services/{serviceName}/errors-and-crashes/crashes/{groupId}', {
        path: {
          serviceName,
          groupId,
        },
        query: {
          rangeFrom,
          rangeTo,
          environment,
          kuery: kueryWithMobileFilters,
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
      kueryWithMobileFilters,
      rangeFrom,
      rangeTo,
      serviceGroup,
      serviceName,
    ]
  );

  const kueryForTreemap = getKueryWithMobileCrashFilter({
    kuery: kueryWithMobileFilters,
    groupId,
  });

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
                kuery: kueryWithMobileFilters,
                start,
                end,
              },
            },
          });
        }
      },
      [environment, kueryWithMobileFilters, serviceName, start, end, groupId]
    );

  const { crashDistributionData, status: crashDistributionStatus } =
    useCrashGroupDistributionFetcher({
      serviceName,
      groupId,
      environment,
      kuery: kueryWithMobileFilters,
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

  // If there are 0 occurrences, show only charts w. empty message
  const showDetails = errorSamplesData.occurrencesCount !== 0;

  return (
    <>
      <CrashGroupHeader groupId={groupId} occurrencesCount={errorSamplesData?.occurrencesCount} />
      <EuiSpacer size="m" />
      <EuiFlexGroup gutterSize="s">
        <ChartPointerEventContextProvider>
          <EuiFlexItem grow={3}>
            <ErrorDistribution
              fetchStatus={crashDistributionStatus}
              distribution={crashDistributionData}
              title={i18n.translate(
                'xpack.apm.serviceDetails.metrics.crashOccurrencesChart.title',
                { defaultMessage: 'Crash occurrences' }
              )}
              height={300}
              tip={i18n.translate('xpack.apm.serviceDetails.metrics.errorOccurrencesChart.tip', {
                defaultMessage: `Crash occurrence is measured in crashes per minute.`,
              })}
            />
          </EuiFlexItem>
        </ChartPointerEventContextProvider>
        <EuiFlexItem grow={3}>
          <MobileErrorsAndCrashesTreemap
            serviceName={serviceName}
            kuery={`${kueryForTreemap}`}
            environment={environment}
            start={start}
            end={end}
          />
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
