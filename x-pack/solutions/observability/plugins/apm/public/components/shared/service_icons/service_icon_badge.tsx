/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBadge,
  EuiIcon,
  EuiPopover,
  EuiPopoverTitle,
  EuiSkeletonText,
  EuiToolTip,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type { EbtClickAttrs } from '@kbn/ebt-click';
import { getEbtProps } from '@kbn/ebt-click';
import { css } from '@emotion/react';
import React, { useState } from 'react';
import { FETCH_STATUS, useFetcher } from '../../../hooks/use_fetcher';
import { CloudDetails } from './cloud_details';
import { ContainerDetails } from './container_details';
import { OTelDetails } from './otel_details';
import { ServerlessDetails } from './serverless_details';
import { ServiceDetails } from './service_details';

export type ServiceIconBadgeKey =
  | 'service'
  | 'opentelemetry'
  | 'container'
  | 'serverless'
  | 'cloud';

interface Props {
  iconKey: ServiceIconBadgeKey;
  iconType: string;
  title: string;
  serviceName: string;
  environment: string;
  start: string;
  end: string;
  ebt?: EbtClickAttrs;
}

const badgeCss = css`
  /* Keep logo badges compact next to the AppHeader title. */
  padding-inline: 6px;
  line-height: 1;
`;

/**
 * AppHeader badge trigger for a service logo: small hollow badge with icon;
 * popover repeats the logo context with full metadata details (Chrome suggestion).
 */
export function ServiceIconBadge({
  iconKey,
  iconType,
  title,
  serviceName,
  environment,
  start,
  end,
  ebt,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const popoverTitleId = useGeneratedHtmlId();

  const { data: details, status: detailsFetchStatus } = useFetcher(
    (callApmApi) => {
      if (isOpen && serviceName && start && end && environment) {
        return callApmApi('GET /internal/apm/services/{serviceName}/metadata/details', {
          isCachable: true,
          params: {
            path: { serviceName },
            query: { start, end, environment },
          },
        });
      }
    },
    [isOpen, serviceName, start, end, environment]
  );

  const isLoading = detailsFetchStatus === FETCH_STATUS.LOADING;

  let content: React.ReactNode = null;
  switch (iconKey) {
    case 'service':
      content = <ServiceDetails service={details?.service} />;
      break;
    case 'opentelemetry':
      content = <OTelDetails opentelemetry={details?.opentelemetry} />;
      break;
    case 'container':
      content = (
        <ContainerDetails container={details?.container} kubernetes={details?.kubernetes} />
      );
      break;
    case 'serverless':
      content = <ServerlessDetails serverless={details?.serverless} />;
      break;
    case 'cloud':
      content = <CloudDetails cloud={details?.cloud} isServerless={!!details?.serverless} />;
      break;
  }

  const ebtProps = ebt ? getEbtProps(ebt) : {};

  return (
    <EuiPopover
      aria-labelledby={popoverTitleId}
      anchorPosition="downCenter"
      ownFocus={false}
      data-test-subj={iconKey}
      button={
        <EuiToolTip content={title} disableScreenReaderOutput>
          <EuiBadge
            color="hollow"
            css={badgeCss}
            className="serviceIcon_button"
            data-test-subj={`popover_${title}`}
            onClick={() => setIsOpen((open) => !open)}
            onClickAriaLabel={title}
            {...ebtProps}
          >
            <EuiIcon type={iconType} size="m" aria-hidden />
          </EuiBadge>
        </EuiToolTip>
      }
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
      onBlur={() => setIsOpen(false)}
    >
      <EuiPopoverTitle id={popoverTitleId}>{title}</EuiPopoverTitle>
      <div style={{ minWidth: 300 }}>
        {isLoading ? <EuiSkeletonText data-test-subj="loading-content" /> : content}
      </div>
    </EuiPopover>
  );
}
