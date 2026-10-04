/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MouseEventHandler, ReactNode } from 'react';
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

/** Presentation descriptor shared by {@link AlertsBadge} and the service flyout header badge. */
export interface AlertsBadgeDescriptor {
  color: 'danger';
  iconType: 'warning';
  /** Badge content (the active-alerts count). */
  label: ReactNode;
  ariaLabel: string;
  toolTipContent: ReactNode;
  /** Set when the badge navigates via a link (preferred — supports open-in-new-tab). */
  href?: string;
  /** Set when the badge navigates via a click handler instead of a link. */
  onClick?: MouseEventHandler<HTMLButtonElement>;
  isInteractive: boolean;
  ebtProps: ReturnType<typeof getEbtProps> | {};
  'data-test-subj': string;
}

/** Resolves the alerts badge presentation so the standalone badge and the flyout header agree. */
export function getAlertsBadgeDescriptor({
  count,
  serviceName,
  navigationProps,
  onClick,
  ebt,
  'data-test-subj': dataTestSubj = DEFAULT_DATA_TEST_SUBJ,
}: AlertsBadgeProps): AlertsBadgeDescriptor {
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

  return {
    color: 'danger',
    iconType: 'warning',
    label: count,
    ariaLabel,
    toolTipContent: isInteractive ? getClickableTooltip(count) : getDisplayTooltip(count),
    href,
    onClick,
    isInteractive,
    ebtProps: ebt && isInteractive ? getEbtProps(ebt) : {},
    'data-test-subj': dataTestSubj,
  };
}

/**
 * Active-alerts count badge shared by the APM service detail header, the service flyout, and the
 * service map (nodes + popover title). Mirrors {@link SloStatusBadge}: it centralizes the markup,
 * tooltip, accessibility wiring, and the clickable/display-only split so the callers only decide
 * whether the badge navigates.
 *
 * When non-interactive but still tooltipped, the badge is wrapped in a focusable `<span>` so the
 * tooltip is reachable by keyboard.
 */
export function AlertsBadge(props: AlertsBadgeProps) {
  const { hideTooltip = false } = props;
  const {
    color,
    iconType,
    label,
    ariaLabel,
    toolTipContent,
    href,
    onClick,
    isInteractive,
    ebtProps,
    'data-test-subj': dataTestSubj,
  } = getAlertsBadgeDescriptor(props);

  const badge = href ? (
    <EuiBadge
      data-test-subj={dataTestSubj}
      color={color}
      iconType={iconType}
      href={href}
      aria-label={ariaLabel}
      tabIndex={0}
      css={clickableBadgeStyles}
      {...ebtProps}
    >
      {label}
    </EuiBadge>
  ) : onClick ? (
    <EuiBadge
      data-test-subj={dataTestSubj}
      color={color}
      iconType={iconType}
      onClick={onClick}
      onClickAriaLabel={ariaLabel}
      tabIndex={0}
      role="button"
      css={clickableBadgeStyles}
      {...ebtProps}
    >
      {label}
    </EuiBadge>
  ) : (
    <EuiBadge
      data-test-subj={dataTestSubj}
      color={color}
      iconType={iconType}
      aria-label={ariaLabel}
    >
      {label}
    </EuiBadge>
  );

  if (hideTooltip) {
    return badge;
  }

  return (
    <EuiToolTip position="bottom" content={toolTipContent}>
      {isInteractive ? badge : <span tabIndex={0}>{badge}</span>}
    </EuiToolTip>
  );
}
