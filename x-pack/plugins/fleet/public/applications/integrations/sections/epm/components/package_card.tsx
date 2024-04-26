/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import styled from 'styled-components';
import {
  EuiBadge,
  EuiButton,
  EuiCard,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiToolTip,
} from '@elastic/eui';
import { css } from '@emotion/react';

import { TrackApplicationView } from '@kbn/usage-collection-plugin/public';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import {
  DEFERRED_ASSETS_WARNING_LABEL,
  DEFERRED_ASSETS_WARNING_MSG,
} from '../screens/detail/assets/deferred_assets_warning';

import { CardIcon } from '../../../../../components/package_icon';
import type { IntegrationCardItem } from '../screens/home';

import { InlineReleaseBadge, WithGuidedOnboardingTour } from '../../../components';
import { useStartServices, useIsGuidedOnboardingActive } from '../../../hooks';
import { INTEGRATIONS_BASE_PATH, INTEGRATIONS_PLUGIN_ID } from '../../../constants';

export type PackageCardProps = IntegrationCardItem;

// Min-height is roughly 3 lines of content.
// This keeps the cards from looking overly unbalanced because of content differences.
const Card = styled(EuiCard)<{ isquickstart?: boolean }>`
  min-height: 127px;
  border-color: ${({ isquickstart }) => (isquickstart ? '#ba3d76' : null)};
`;

export function PackageCard({
  description,
  name,
  title,
  version,
  icons,
  integration,
  url,
  release,
  id,
  fromIntegrations,
  isReauthorizationRequired,
  isUnverified,
  isUpdateAvailable,
  showLabels = true,
  extraLabelsBadges,
  isQuickstart = false,
  onCardClick: onClickProp = undefined,
  isCollectionCard = false,
}: PackageCardProps) {
  let releaseBadge: React.ReactNode | null = null;

  if (release && release !== 'ga') {
    releaseBadge = (
      <EuiFlexItem grow={false}>
        <EuiSpacer size="xs" />
        <span>
          <InlineReleaseBadge release={release} />
        </span>
      </EuiFlexItem>
    );
  }

  let verifiedBadge: React.ReactNode | null = null;
  if (isUnverified && showLabels) {
    verifiedBadge = (
      <EuiFlexItem grow={false}>
        <EuiSpacer size="xs" />
        <span>
          <EuiBadge color="warning">
            <FormattedMessage
              id="xpack.fleet.packageCard.unverifiedLabel"
              defaultMessage="Unverified"
            />
          </EuiBadge>
        </span>
      </EuiFlexItem>
    );
  }

  let hasDeferredInstallationsBadge: React.ReactNode | null = null;

  if (isReauthorizationRequired && showLabels) {
    hasDeferredInstallationsBadge = (
      <EuiFlexItem grow={false}>
        <EuiSpacer size="xs" />
        <span>
          <EuiToolTip
            display="inlineBlock"
            content={DEFERRED_ASSETS_WARNING_MSG}
            title={DEFERRED_ASSETS_WARNING_LABEL}
          >
            <EuiBadge color="warning">{DEFERRED_ASSETS_WARNING_LABEL} </EuiBadge>
          </EuiToolTip>
        </span>
      </EuiFlexItem>
    );
  }

  let updateAvailableBadge: React.ReactNode | null = null;

  if (isUpdateAvailable && showLabels) {
    updateAvailableBadge = (
      <EuiFlexItem grow={false}>
        <EuiSpacer size="xs" />
        <span>
          <EuiBadge color="hollow" iconType="sortUp">
            <FormattedMessage
              id="xpack.fleet.packageCard.updateAvailableLabel"
              defaultMessage="Update available"
            />
          </EuiBadge>
        </span>
      </EuiFlexItem>
    );
  }

  let collectionButton: React.ReactNode | null = null;

  if (isCollectionCard) {
    collectionButton = (
      <EuiFlexItem>
        <EuiButton
          color="text"
          data-test-subj="xpack.fleet.packageCard.collectionButton"
          iconType="package"
        >
          <FormattedMessage
            id="xpack.fleet.packageCard.collectionButton.copy"
            defaultMessage="View collection"
          />
        </EuiButton>
      </EuiFlexItem>
    );
  }

  const { application } = useStartServices();
  const isGuidedOnboardingActive = useIsGuidedOnboardingActive(name);

  const onCardClick = () => {
    if (url.startsWith(INTEGRATIONS_BASE_PATH)) {
      application.navigateToApp(INTEGRATIONS_PLUGIN_ID, {
        path: url.slice(INTEGRATIONS_BASE_PATH.length),
        state: { fromIntegrations },
      });
    } else if (url.startsWith('http') || url.startsWith('https')) {
      window.open(url, '_blank');
    } else {
      application.navigateToUrl(url);
    }
  };

  const testid = `integration-card:${id}`;
  return (
    <WithGuidedOnboardingTour
      packageKey={name}
      isTourVisible={isGuidedOnboardingActive}
      tourType={'integrationCard'}
      tourOffset={10}
    >
      <TrackApplicationView viewId={testid}>
        <Card
          // EUI TODO: Custom component CSS
          css={css`
            [class*='euiCard__content'] {
              display: flex;
              flex-direction: column;
              block-size: 100%;
            }

            [class*='euiCard__description'] {
              flex-grow: 1;
            }
          `}
          data-test-subj={testid}
          isquickstart={isQuickstart}
          betaBadgeProps={quickstartBadge(isQuickstart)}
          layout="horizontal"
          title={title || ''}
          titleSize="xs"
          description={description}
          hasBorder
          icon={
            <CardIcon
              icons={icons}
              packageName={name}
              integrationName={integration}
              version={version}
              size="xl"
            />
          }
          onClick={onClickProp ?? onCardClick}
        >
          <EuiFlexGroup gutterSize="xs" wrap={true}>
            {showLabels && extraLabelsBadges ? extraLabelsBadges : null}
            {verifiedBadge}
            {updateAvailableBadge}
            {releaseBadge}
            {hasDeferredInstallationsBadge}
            {collectionButton}
          </EuiFlexGroup>
        </Card>
      </TrackApplicationView>
    </WithGuidedOnboardingTour>
  );
}

function quickstartBadge(isQuickstart: boolean): { label: string; color: 'accent' } | undefined {
  return isQuickstart
    ? {
        label: i18n.translate('xpack.fleet.packageCard.quickstartBadge.label', {
          defaultMessage: 'Quickstart',
        }),
        color: 'accent',
      }
    : undefined;
}
