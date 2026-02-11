/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import { EuiButtonEmpty, EuiLink } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { DISCOVER_APP_LOCATOR } from '@kbn/deeplinks-analytics';
import { FETCH_STATUS } from '@kbn/observability-shared-plugin/public';
import { useApmServiceContext } from '../../../../context/apm_service/use_apm_service_context';
import { useApmPluginContext } from '../../../../context/apm_plugin/use_apm_plugin_context';
import { getESQLQuery } from './get_esql_query';
import type { ESQLQueryParams } from './get_esql_query';

const linkStyle = css`
  height: 24px;
  display: inline-flex;
  align-items: center;
`;

const OPEN_IN_DISCOVER_LABEL = i18n.translate('xpack.apm.openInDiscover.label', {
  defaultMessage: 'Open in Discover',
});

interface OpenInDiscoverProps {
  dataTestSubj: string;
  variant: 'button' | 'link';
  indexType: 'traces' | 'error';
  rangeFrom: string;
  rangeTo: string;
  queryParams: ESQLQueryParams;
}

export function OpenInDiscover({
  dataTestSubj,
  variant,
  indexType,
  rangeFrom,
  rangeTo,
  queryParams,
}: OpenInDiscoverProps) {
  const { share } = useApmPluginContext();
  const { indexSettings, indexSettingsStatus } = useApmServiceContext();

  const esqlQuery = getESQLQuery({
    indexType,
    params: queryParams,
    indexSettings,
  });

  const discoverHref = share.url.locators.get(DISCOVER_APP_LOCATOR)?.getRedirectUrl({
    timeRange: {
      from: rangeFrom,
      to: rangeTo,
    },
    query: {
      esql: esqlQuery,
    },
  });

  const isDisabled = !esqlQuery || !discoverHref || indexSettingsStatus !== FETCH_STATUS.SUCCESS;

  if (variant === 'button') {
    return (
      <EuiButtonEmpty
        data-test-subj={dataTestSubj}
        aria-label={OPEN_IN_DISCOVER_LABEL}
        isLoading={indexSettingsStatus === FETCH_STATUS.LOADING}
        isDisabled={isDisabled}
        iconType="discoverApp"
        href={discoverHref}
      >
        {OPEN_IN_DISCOVER_LABEL}
      </EuiButtonEmpty>
    );
  }

  return (
    <EuiLink
      data-test-subj={dataTestSubj}
      css={linkStyle}
      {...(isDisabled ? { disabled: true, color: 'subdued' } : { href: discoverHref })}
    >
      {OPEN_IN_DISCOVER_LABEL}
    </EuiLink>
  );
}
