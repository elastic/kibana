/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButtonEmpty } from '@elastic/eui';
import { DISCOVER_APP_LOCATOR } from '@kbn/deeplinks-analytics';
import { FETCH_STATUS } from '@kbn/observability-shared-plugin/public';
import { useApmServiceContext } from '../../../../context/apm_service/use_apm_service_context';
import { useApmPluginContext } from '../../../../context/apm_plugin/use_apm_plugin_context';

export function BaseDiscoverButton({
  dataTestSubj,
  esqlQuery,
  rangeTo,
  rangeFrom,
  label,
  ariaLabel,
}: {
  dataTestSubj: string;
  esqlQuery: string | null;
  rangeTo: string;
  rangeFrom: string;
  label: string;
  ariaLabel: string;
}) {
  const { share } = useApmPluginContext();
  const { indexSettingsStatus } = useApmServiceContext();

  const discoverHref = share.url.locators.get(DISCOVER_APP_LOCATOR)?.getRedirectUrl({
    timeRange: {
      from: rangeFrom,
      to: rangeTo,
    },
    query: {
      esql: esqlQuery,
    },
  });

  return (
    <EuiButtonEmpty
      aria-label={ariaLabel}
      isLoading={indexSettingsStatus === FETCH_STATUS.LOADING}
      data-test-subj={dataTestSubj}
      iconType="discoverApp"
      href={discoverHref}
      isDisabled={!esqlQuery || indexSettingsStatus !== FETCH_STATUS.SUCCESS}
    >
      {label}
    </EuiButtonEmpty>
  );
}
