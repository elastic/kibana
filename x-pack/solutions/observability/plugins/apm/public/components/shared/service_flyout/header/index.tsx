/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLink, EuiToolTip } from '@elastic/eui';
import { EBT_CLICK_ACTIONS, getEbtProps } from '@kbn/ebt-click';
import { i18n } from '@kbn/i18n';
import type { ReactNode } from 'react';
import React from 'react';
import { SERVICE_FLYOUT_EBT_ELEMENTS } from '../ebt_constants';
import { useServiceFlyoutLinks } from '../hooks/use_service_flyout_links';
import { useServiceFlyoutContext } from '../service_flyout_context';

const TITLE_LINK_TOOLTIP = i18n.translate('xpack.apm.serviceFlyout.titleLinkTooltip', {
  defaultMessage: 'Open service overview',
});

/**
 * Builds the service flyout title node for `FlyoutTemplate.Header`: a link to the service overview
 * when the capability and href are available, otherwise plain text. The template owns the heading
 * element; this returns only its content.
 */
export function useServiceFlyoutTitle(title: string): ReactNode {
  const { capabilities } = useServiceFlyoutContext();
  const { apm } = useServiceFlyoutLinks();
  const serviceOverviewHref = apm.overviewTab;
  const showServiceNameLink = Boolean(
    serviceOverviewHref && (capabilities.header?.serviceNameLink ?? false)
  );

  if (!showServiceNameLink) {
    return <span data-test-subj="serviceFlyoutTitle">{title}</span>;
  }

  return (
    <span data-test-subj="serviceFlyoutTitle">
      <EuiToolTip content={TITLE_LINK_TOOLTIP} position="bottom">
        <EuiLink
          href={serviceOverviewHref}
          data-test-subj="serviceFlyoutTitleLink"
          {...getEbtProps({
            action: EBT_CLICK_ACTIONS.VIEW_SERVICE,
            element: SERVICE_FLYOUT_EBT_ELEMENTS.TITLE,
          })}
        >
          {title}
        </EuiLink>
      </EuiToolTip>
    </span>
  );
}
