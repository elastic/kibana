/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import styled from 'styled-components';
import { EuiBadge, EuiCard, EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';

import { TrackApplicationView } from '@kbn/usage-collection-plugin/public';

import { FormattedMessage } from '@kbn/i18n-react';

import { CardIcon } from '../../../../../components/package_icon';
import type { IntegrationCardItem } from '../../../../../../common/types/models/epm';

import { InlineReleaseBadge, WithGuidedOnboardingTour } from '../../../components';
import { useStartServices, useIsGuidedOnboardingActive } from '../../../hooks';
import { INTEGRATIONS_BASE_PATH, INTEGRATIONS_PLUGIN_ID } from '../../../constants';

export type PackageCardProps = IntegrationCardItem;

// Min-height is roughly 3 lines of content.
// This keeps the cards from looking overly unbalanced because of content differences.
const Card = styled(EuiCard)`
  min-height: 127px;
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
  isUnverified,
  isUpdateAvailable,
  showLabels = true,
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

  let updateAvailableBadge: React.ReactNode | null = null;

  if (isUpdateAvailable && showLabels) {
    updateAvailableBadge = (
      <EuiFlexItem grow={false}>
        <EuiSpacer size="xs" />
        <span>
          <EuiBadge color="warning">
            <FormattedMessage
              id="xpack.fleet.packageCard.updateAvailableLabel"
              defaultMessage="Update available"
            />
          </EuiBadge>
        </span>
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
          data-test-subj={testid}
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
          onClick={onCardClick}
        >
          <EuiFlexGroup gutterSize="xs">
            {verifiedBadge}
            {updateAvailableBadge}
            {releaseBadge}
          </EuiFlexGroup>
        </Card>
      </TrackApplicationView>
    </WithGuidedOnboardingTour>
  );
}
