/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexItem, EuiSelect } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { useHistory } from 'react-router-dom';
import type { APIReturnType } from '@kbn/apm-api-shared';
import { MobileProperty, MobileErrorType } from '../../../../../../common/mobile_types';
import { useTimeRange } from '../../../../../hooks/use_time_range';
import { useApmServiceContext } from '../../../../../context/apm_service/use_apm_service_context';
import { useAnyOfApmParams, useMaybeApmParams } from '../../../../../hooks/use_apm_params';
import { useFetcher, FETCH_STATUS } from '../../../../../hooks/use_fetcher';
import { push } from '../../../../shared/links/url_helpers';

type MobileFilter =
  APIReturnType<'GET /internal/apm/services/{serviceName}/mobile/filters'>['mobileFilters'][0];

const ALL_OPTION = {
  value: 'all',
  text: 'All',
};

const MOBILE_FILTERS: Array<{ key: MobileFilter['key']; label: string }> = [
  {
    key: MobileProperty.Device,
    label: i18n.translate('xpack.apm.mobile.filters.device', {
      defaultMessage: 'Device',
    }),
  },
  {
    key: MobileProperty.OsVersion,
    label: i18n.translate('xpack.apm.mobile.filters.osVersion', {
      defaultMessage: 'OS version',
    }),
  },
  {
    key: MobileProperty.AppVersion,
    label: i18n.translate('xpack.apm.mobile.filters.appVersion', {
      defaultMessage: 'App version',
    }),
  },
  {
    key: MobileProperty.NetworkConnectionType,
    label: i18n.translate('xpack.apm.mobile.filters.nct', {
      defaultMessage: 'NCT',
    }),
  },
];

/**
 * Scopes the filter dropdown options to the documents the current screen actually lists, so
 * they can't offer values that match nothing. Detail routes win over the tab id: they are
 * nested under errors-and-crashes, so that route matches on them too.
 */
export function getMobileFiltersErrorType({
  isCrashDetail,
  isErrorDetail,
  isErrorsAndCrashes,
  mobileErrorTabId,
}: {
  isCrashDetail: boolean;
  isErrorDetail: boolean;
  isErrorsAndCrashes: boolean;
  mobileErrorTabId?: string;
}): MobileErrorType | undefined {
  if (isCrashDetail) {
    return MobileErrorType.Crash;
  }

  if (isErrorDetail) {
    return MobileErrorType.Error;
  }

  // Overview and transactions, where transaction and span documents are the right source.
  if (!isErrorsAndCrashes) {
    return undefined;
  }

  // The errors tab is the default and is rendered before `mobileErrorTabId` reaches the
  // URL, so anything that isn't `crashes` is the errors tab.
  return mobileErrorTabId === 'crashes' ? MobileErrorType.Crash : MobileErrorType.Error;
}

export function MobileFilters() {
  const history = useHistory();
  const { serviceName } = useApmServiceContext();

  const {
    query: {
      environment,
      kuery,
      rangeFrom,
      rangeTo,
      netConnectionType,
      device,
      osVersion,
      appVersion,
      transactionType,
    },
  } = useAnyOfApmParams(
    '/mobile-services/{serviceName}/overview',
    '/mobile-services/{serviceName}/transactions',
    '/mobile-services/{serviceName}/transactions/view',
    '/mobile-services/{serviceName}/errors-and-crashes'
  );

  // `mobileErrorTabId` only exists on the errors-and-crashes route, so it can't be
  // destructured from the union above. Read the whole params object separately: it is
  // undefined on the other screens, which is how we tell "not on this route" apart from
  // "on this route with the tab defaulted".
  const errorsAndCrashesParams = useMaybeApmParams(
    '/mobile-services/{serviceName}/errors-and-crashes'
  );

  // The detail routes are nested under errors-and-crashes, so the params above match there
  // too. Match them explicitly: their scope comes from the route, not from a query param
  // that a deep link or bookmark may not carry.
  const isCrashDetail = !!useMaybeApmParams(
    '/mobile-services/{serviceName}/errors-and-crashes/crashes/{groupId}'
  );
  const isErrorDetail = !!useMaybeApmParams(
    '/mobile-services/{serviceName}/errors-and-crashes/errors/{groupId}'
  );

  const filters = { netConnectionType, device, osVersion, appVersion };
  const { start, end } = useTimeRange({ rangeFrom, rangeTo });

  const errorType = getMobileFiltersErrorType({
    isCrashDetail,
    isErrorDetail,
    isErrorsAndCrashes: !!errorsAndCrashesParams,
    mobileErrorTabId: errorsAndCrashesParams?.query.mobileErrorTabId,
  });

  const { data = { mobileFilters: [] }, status } = useFetcher(
    (callApmApi) => {
      return callApmApi('GET /internal/apm/services/{serviceName}/mobile/filters', {
        params: {
          path: { serviceName },
          query: { start, end, environment, kuery, transactionType, errorType },
        },
      });
    },
    [start, end, environment, kuery, serviceName, transactionType, errorType]
  );

  function toSelectOptions(items?: string[]) {
    return [ALL_OPTION, ...(items?.map((item) => ({ value: item, text: item })) || [])];
  }

  function onChangeFilter(key: MobileFilter['key'], value: string) {
    push(history, {
      query: { [key]: value === ALL_OPTION.value ? '' : value },
    });
  }

  return (
    <>
      {MOBILE_FILTERS.map(({ key, label }) => {
        const selectOptions =
          data?.mobileFilters.find((filter: MobileFilter) => filter.key === key)?.options ?? [];

        return (
          <EuiFlexItem key={key}>
            <EuiSelect
              data-test-subj="apmMobileFiltersSelect"
              compressed
              fullWidth
              isLoading={status === FETCH_STATUS.LOADING}
              prepend={label}
              aria-label={label}
              options={toSelectOptions(selectOptions)}
              value={filters?.[key]}
              onChange={(e) => {
                onChangeFilter(key, e.target.value);
              }}
            />
          </EuiFlexItem>
        );
      })}
    </>
  );
}
