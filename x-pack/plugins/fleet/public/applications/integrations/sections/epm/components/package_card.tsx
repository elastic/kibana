/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import styled from 'styled-components';
import { EuiBadge, EuiCard, EuiFlexItem, EuiSpacer } from '@elastic/eui';

import { TrackApplicationView } from '@kbn/usage-collection-plugin/public';

import { FormattedMessage } from '@kbn/i18n-react';

import { CardIcon } from '../../../../../components/package_icon';
import type { IntegrationCardItem } from '../../../../../../common/types/models/epm';

import { useStartServices } from '../../../hooks';
import { INTEGRATIONS_BASE_PATH, INTEGRATIONS_PLUGIN_ID } from '../../../constants';

import { CardReleaseBadge } from './release_badge';

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
}: PackageCardProps) {
  let releaseBadge: React.ReactNode | null = null;

  if (release && release !== 'ga') {
    releaseBadge = (
      <EuiFlexItem grow={false}>
        <EuiSpacer size="xs" />
        <span>
          <CardReleaseBadge release={release} />
        </span>
      </EuiFlexItem>
    );
  }

  if (isUnverified) {
    releaseBadge = (
      <EuiFlexItem grow={false}>
        <EuiSpacer size="xs" />
        <span>
          <EuiBadge color="warning">
            <FormattedMessage id="packageCard.unverifiedLabel" defaultMessage="Unverified" />
          </EuiBadge>
        </span>
      </EuiFlexItem>
    );
  }

  const { application } = useStartServices();

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
        {releaseBadge}
      </Card>
    </TrackApplicationView>
  );
}
