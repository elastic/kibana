/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import { EuiButton, EuiButtonEmpty, EuiLink } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FETCH_STATUS } from '../../../../hooks/use_fetcher';
import { useApmIndexSettingsContext } from '../../../../context/apm_index_settings/use_apm_index_settings_context';
import type { ESQLQueryParams } from './get_esql_query';
import { useDiscoverHref } from './use_discover_href';

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
  variant: 'button' | 'outlinedButton' | 'link';
  indexType: 'traces' | 'error';
  rangeFrom: string;
  rangeTo: string;
  queryParams: ESQLQueryParams;
  label?: string;
}

export function OpenInDiscover({
  dataTestSubj,
  variant,
  indexType,
  rangeFrom,
  rangeTo,
  queryParams,
  label = OPEN_IN_DISCOVER_LABEL,
}: OpenInDiscoverProps) {
  const { indexSettingsStatus } = useApmIndexSettingsContext();

  const discoverHref = useDiscoverHref({
    indexType,
    rangeFrom,
    rangeTo,
    queryParams,
  });

  const isDisabled = !discoverHref || indexSettingsStatus !== FETCH_STATUS.SUCCESS;

  if (variant === 'outlinedButton') {
    return (
      <EuiButton
        data-test-subj={dataTestSubj}
        aria-label={label}
        isLoading={indexSettingsStatus === FETCH_STATUS.LOADING}
        isDisabled={isDisabled}
        iconType="discoverApp"
        href={discoverHref}
      >
        {label}
      </EuiButton>
    );
  }

  if (variant === 'button') {
    return (
      <EuiButtonEmpty
        data-test-subj={dataTestSubj}
        aria-label={label}
        isLoading={indexSettingsStatus === FETCH_STATUS.LOADING}
        isDisabled={isDisabled}
        iconType="discoverApp"
        href={discoverHref}
      >
        {label}
      </EuiButtonEmpty>
    );
  }

  return (
    <EuiLink
      data-test-subj={dataTestSubj}
      css={linkStyle}
      {...(isDisabled ? { disabled: true, color: 'subdued' } : { href: discoverHref })}
    >
      {label}
    </EuiLink>
  );
}
