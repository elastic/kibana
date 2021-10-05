/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import styled from 'styled-components';
import { EuiCard } from '@elastic/eui';

import { CardIcon } from '../../../../../components/package_icon';
import type { IntegrationCardItem } from '../../../../../../common/types/models/epm';

import { RELEASE_BADGE_DESCRIPTION, RELEASE_BADGE_LABEL } from './release_badge';

export type PackageCardProps = IntegrationCardItem;

// adding the `href` causes EuiCard to use a `a` instead of a `button`
// `a` tags use `euiLinkColor` which results in blueish Badge text
const Card = styled(EuiCard)`
  color: inherit;
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
}: PackageCardProps) {
  const betaBadgeLabel = release && release !== 'ga' ? RELEASE_BADGE_LABEL[release] : undefined;
  const betaBadgeLabelTooltipContent =
    release && release !== 'ga' ? RELEASE_BADGE_DESCRIPTION[release] : undefined;

  return (
    <Card
      title={title || ''}
      description={description}
      icon={
        <CardIcon
          icons={icons}
          packageName={name}
          integrationName={integration}
          version={version}
          size="xl"
        />
      }
      href={url}
      betaBadgeLabel={betaBadgeLabel}
      betaBadgeTooltipContent={betaBadgeLabelTooltipContent}
      target={url.startsWith('http') || url.startsWith('https') ? '_blank' : undefined}
    />
  );
}
