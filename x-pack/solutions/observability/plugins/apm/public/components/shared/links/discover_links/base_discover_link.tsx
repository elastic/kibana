/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiLink } from '@elastic/eui';
import { DISCOVER_APP_LOCATOR } from '@kbn/deeplinks-analytics';
import { FETCH_STATUS } from '@kbn/observability-shared-plugin/public';
import { useApmServiceContext } from '../../../../context/apm_service/use_apm_service_context';
import { useApmPluginContext } from '../../../../context/apm_plugin/use_apm_plugin_context';

export function BaseDiscoverLink({
  dataTestSubj,
  esqlQuery,
  rangeTo,
  rangeFrom,
  children,
}: {
  dataTestSubj: string;
  esqlQuery: string | null;
  rangeTo: string;
  rangeFrom: string;
  children: React.ReactNode;
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

  const isDisabled = !esqlQuery || indexSettingsStatus !== FETCH_STATUS.SUCCESS;

  if (isDisabled) {
    return (
      <EuiLink data-test-subj={dataTestSubj} color="subdued" disabled>
        {children}
      </EuiLink>
    );
  }

  return (
    <EuiLink data-test-subj={dataTestSubj} href={discoverHref}>
      {children}
    </EuiLink>
  );
}
