/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import { EuiButton, EuiButtonEmpty, EuiButtonIcon, EuiLink, EuiToolTip } from '@elastic/eui';
import { EBT_CLICK_ACTIONS, getEbtProps } from '@kbn/ebt-click';
import type { EbtClickAttrs } from '@kbn/ebt-click';
import { FETCH_STATUS } from '../../../../hooks/use_fetcher';
import { useApmIndexSettingsContext } from '../../../../context/apm_index_settings/use_apm_index_settings_context';
import type { ESQLQueryParams } from './get_esql_query';
import { useDiscoverHref } from './use_discover_href';

const linkStyle = css`
  height: 24px;
  display: inline-flex;
  align-items: center;
`;

type DiscoverButtonVariant = 'button' | 'emptyButton' | 'iconButton' | 'link';

interface OpenInDiscoverProps {
  dataTestSubj: string;
  label: string;
  variant: DiscoverButtonVariant;
  indexType: 'traces' | 'error';
  rangeFrom: string;
  rangeTo: string;
  queryParams: ESQLQueryParams;
  ebt: Partial<EbtClickAttrs> & Pick<EbtClickAttrs, 'element'>;
}

export function OpenInDiscover({
  dataTestSubj,
  label,
  variant,
  indexType,
  rangeFrom,
  rangeTo,
  queryParams,
  ebt,
}: OpenInDiscoverProps) {
  const { indexSettingsStatus } = useApmIndexSettingsContext();

  const discoverHref = useDiscoverHref({
    indexType,
    rangeFrom,
    rangeTo,
    queryParams,
  });

  const isDisabled = !discoverHref || indexSettingsStatus !== FETCH_STATUS.SUCCESS;
  const ebtProps = ebt ? getEbtProps({ action: EBT_CLICK_ACTIONS.OPEN_IN_DISCOVER, ...ebt }) : {};

  switch (variant) {
    case 'button':
      return (
        <EuiButton
          data-test-subj={dataTestSubj}
          aria-label={label}
          isLoading={indexSettingsStatus === FETCH_STATUS.LOADING}
          isDisabled={isDisabled}
          iconType="discoverApp"
          href={discoverHref}
          {...ebtProps}
        >
          {label}
        </EuiButton>
      );
    case 'emptyButton':
      return (
        <EuiButtonEmpty
          data-test-subj={dataTestSubj}
          aria-label={label}
          isLoading={indexSettingsStatus === FETCH_STATUS.LOADING}
          isDisabled={isDisabled}
          iconType="discoverApp"
          href={discoverHref}
          {...ebtProps}
        >
          {label}
        </EuiButtonEmpty>
      );
    case 'iconButton':
      return (
        <EuiToolTip content={label} disableScreenReaderOutput>
          <EuiButtonIcon
            data-test-subj={dataTestSubj}
            aria-label={label}
            isLoading={indexSettingsStatus === FETCH_STATUS.LOADING}
            isDisabled={isDisabled}
            iconType="discoverApp"
            href={discoverHref}
            {...ebtProps}
          />
        </EuiToolTip>
      );
    case 'link':
      return (
        <EuiLink
          data-test-subj={dataTestSubj}
          css={linkStyle}
          {...(isDisabled ? { disabled: true, color: 'subdued' } : { href: discoverHref })}
          {...ebtProps}
        >
          {label}
        </EuiLink>
      );
  }
}
