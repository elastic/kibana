/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MouseEventHandler } from 'react';
import React from 'react';
import { css } from '@emotion/react';
import { EuiBadge, EuiToolTip } from '@elastic/eui';
import type { EbtClickAttrs } from '@kbn/ebt-click';
import { getEbtProps } from '@kbn/ebt-click';
import { i18n } from '@kbn/i18n';
import type { AgentName } from '@kbn/elastic-agent-utils';
import type { Environment } from '@kbn/apm-types';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import { isMobileAgentName } from '../../../../common/agent_name';
import { APM_APP_LOCATOR_ID } from '../../../locator/service_detail_locator';

const DEFAULT_DATA_TEST_SUBJ = 'apmAlertsBadge';

/**
 * EUI only applies `cursor: pointer` to the clickable badge's text span, so hovering the icon (or
 * its surrounding content) keeps the default cursor. Force the pointer across the whole button.
 */
const clickableBadgeStyles = css`
  &,
  .euiBadge__content,
  .euiBadge__icon {
    cursor: pointer;
  }
`;

function getClickableTooltip(count: number) {
  return i18n.translate('xpack.apm.alertsBadge.tooltip.clickable', {
    defaultMessage:
      '{count, plural, one {# active alert} other {# active alerts}}. Click to view more.',
    values: { count },
  });
}

function getDisplayTooltip(count: number) {
  return i18n.translate('xpack.apm.alertsBadge.tooltip', {
    defaultMessage: '{count, plural, one {# active alert} other {# active alerts}}',
    values: { count },
  });
}

function getAriaLabel(count: number, serviceName: string) {
  return i18n.translate('xpack.apm.alertsBadge.ariaLabel', {
    defaultMessage:
      '{count, plural, one {# active alert} other {# active alerts}} for {serviceName}',
    values: { count, serviceName },
  });
}

export interface AlertsBadgeNavigationProps {
  serviceName: string;
  agentName: AgentName;
  environment: Environment;
  rangeFrom: string;
  rangeTo: string;
  locators: SharePluginStart['url']['locators'];
}

export interface AlertsBadgeProps {
  count: number;
  /** Used to build the accessible label (e.g. "3 active alerts for opbeans-java"). */
  serviceName: string;
  /**
   * When provided, the badge computes the alerts-tab href internally and renders as a link.
   * Prefer this over `onClick` for standard navigation (supports right-click → open in new tab).
   */
  navigationProps?: AlertsBadgeNavigationProps;
  /** When provided, the badge becomes an interactive button (e.g. navigate to the Alerts tab). */
  onClick?: MouseEventHandler<HTMLButtonElement>;
  /** When true, no `EuiToolTip` is rendered (e.g. display-only service map nodes). */
  hideTooltip?: boolean;
  /** EBT click attributes; applied when the badge is interactive (navigationProps or onClick). */
  ebt?: EbtClickAttrs;
  'data-test-subj'?: string;
}

/**
 * Active-alerts count badge shared by the APM service detail header, the service flyout, and the
 * service map (nodes + popover title). Mirrors {@link SloStatusBadge}: it centralizes the markup,
 * tooltip, accessibility wiring, and the clickable/display-only split so the callers only decide
 * whether the badge navigates.
 *
 * `EuiBadgeProps` is a discriminated union, so `onClick` cannot be spread conditionally — the two
 * variants are rendered explicitly while sharing their static props. When non-interactive but
 * still tooltipped, the badge is wrapped in a focusable `<span>` so the tooltip is reachable by
 * keyboard (EUI requires the tooltip anchor to be focusable).
 */
export function AlertsBadge({
  count,
  serviceName,
  navigationProps,
  onClick,
  hideTooltip = false,
  ebt,
  'data-test-subj': dataTestSubj = DEFAULT_DATA_TEST_SUBJ,
}: AlertsBadgeProps) {
  const ariaLabel = getAriaLabel(count, serviceName);

  const href = navigationProps
    ? navigationProps.locators.get(APM_APP_LOCATOR_ID)?.getRedirectUrl({
        serviceName: navigationProps.serviceName,
        isMobileAgentName: isMobileAgentName(navigationProps.agentName),
        serviceOverviewTab: 'alerts',
        query: {
          environment: navigationProps.environment,
          rangeFrom: navigationProps.rangeFrom,
          rangeTo: navigationProps.rangeTo,
        },
      })
    : undefined;

  const isInteractive = !!(href || onClick);
  const ebtProps = ebt && isInteractive ? getEbtProps(ebt) : {};

  const badge = href ? (
    <EuiBadge
      data-test-subj={dataTestSubj}
      color="danger"
      iconType="warning"
      href={href}
      aria-label={ariaLabel}
      tabIndex={0}
      css={clickableBadgeStyles}
      {...ebtProps}
    >
      {count}
    </EuiBadge>
  ) : onClick ? (
    <EuiBadge
      data-test-subj={dataTestSubj}
      color="danger"
      iconType="warning"
      onClick={onClick}
      onClickAriaLabel={ariaLabel}
      tabIndex={0}
      role="button"
      css={clickableBadgeStyles}
      {...ebtProps}
    >
      {count}
    </EuiBadge>
  ) : (
    <EuiBadge
      data-test-subj={dataTestSubj}
      color="danger"
      iconType="warning"
      aria-label={ariaLabel}
    >
      {count}
    </EuiBadge>
  );

  if (hideTooltip) {
    return badge;
  }

  const tooltipContent = isInteractive ? getClickableTooltip(count) : getDisplayTooltip(count);

  return (
    <EuiToolTip position="bottom" content={tooltipContent}>
      {isInteractive ? badge : <span tabIndex={0}>{badge}</span>}
    </EuiToolTip>
  );
}
