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

type PackageCardProps = IntegrationCardItem;

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
  uiInternalPathUrl,
  betaBadgeLabel,
  betaBadgeLabelTooltipContent,
}: PackageCardProps) {
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
      href={uiInternalPathUrl}
      betaBadgeLabel={betaBadgeLabel}
      betaBadgeTooltipContent={betaBadgeLabelTooltipContent}
    />
  );
}
