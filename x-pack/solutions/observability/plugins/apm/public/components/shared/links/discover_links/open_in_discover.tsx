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
import type { DiscoverIndexSource, ESQLQueryParams } from './get_esql_query';
import { useDiscoverHref } from './use_discover_href';

const linkStyle = css`
  height: 24px;
  display: inline-flex;
  align-items: center;
`;

type DiscoverButtonVariant = 'button' | 'emptyButton' | 'iconButton' | 'link';

type OpenInDiscoverLinkParams = DiscoverIndexSource & {
  rangeFrom: string;
  rangeTo: string;
  queryParams: ESQLQueryParams;
  ebt: Partial<EbtClickAttrs> & Pick<EbtClickAttrs, 'element'>;
};

type OpenInDiscoverProps = OpenInDiscoverLinkParams & {
  dataTestSubj: string;
  label: string;
  variant: DiscoverButtonVariant;
};

export interface OpenInDiscoverLink {
  href: string | undefined;
  isLoading: boolean;
  isDisabled: boolean;
  ebtProps: ReturnType<typeof getEbtProps> | {};
}

/** Resolves a Discover link's href, loading and disabled state, and EBT attributes. */
export function useOpenInDiscoverLink({
  rangeFrom,
  rangeTo,
  queryParams,
  ebt,
  ...source
}: OpenInDiscoverLinkParams): OpenInDiscoverLink {
  const { indexSettingsStatus } = useApmIndexSettingsContext();

  const href = useDiscoverHref({
    ...source,
    rangeFrom,
    rangeTo,
    queryParams,
  });

  // For log-source links, the APM index settings are irrelevant — the link is gated only
  // on whether the log-sources pattern resolved (which arrives via queryParams/indexPattern).
  const usesApmIndexSettings = source.indexType !== 'logs';
  const isLoading = usesApmIndexSettings && indexSettingsStatus === FETCH_STATUS.LOADING;
  const isDisabled =
    !href || (usesApmIndexSettings && indexSettingsStatus !== FETCH_STATUS.SUCCESS);
  const ebtProps = ebt ? getEbtProps({ action: EBT_CLICK_ACTIONS.OPEN_IN_DISCOVER, ...ebt }) : {};

  return { href, isLoading, isDisabled, ebtProps };
}

export function OpenInDiscover({
  dataTestSubj,
  label,
  variant,
  ...linkParams
}: OpenInDiscoverProps) {
  const { href: discoverHref, isLoading, isDisabled, ebtProps } = useOpenInDiscoverLink(linkParams);

  switch (variant) {
    case 'button':
      return (
        <EuiButton
          data-test-subj={dataTestSubj}
          aria-label={label}
          isLoading={isLoading}
          isDisabled={isDisabled}
          iconType="productDiscover"
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
          isLoading={isLoading}
          isDisabled={isDisabled}
          iconType="productDiscover"
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
            isLoading={isLoading}
            isDisabled={isDisabled}
            iconType="productDiscover"
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
