/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import styled from 'styled-components';
import { EuiCard } from '@elastic/eui';

import type { PackageListItem } from '../../../types';
import { CardIcon } from '../../../../../components/package_icon';

type PackageCardProps = PackageListItem & {
  type?: string;
  uiInternalPath?: string;
  uiInternalPathUrl: string;
  betaBadgeLabel?: string;
  betaBadgeLabelTooltipContent?: string;
};

// adding the `href` causes EuiCard to use a `a` instead of a `button`
// `a` tags use `euiLinkColor` which results in blueish Badge text
const Card = styled(EuiCard)`
  color: inherit;
`;

export function PackageCard(props: PackageCardProps) {
  const {
    description,
    name,
    title,
    version,
    release,
    status,
    icons,
    integration,
    type,
    uiInternalPath,
    uiInternalPathUrl,
    betaBadgeLabel,
    betaBadgeLabelTooltipContent,
    ...restProps
  } = props;

  const icon = (
    <CardIcon
      icons={icons}
      packageName={name}
      integrationName={integration}
      version={version}
      size="xl"
    />
  );

  return (
    <Card
      title={title || ''}
      description={description}
      icon={icon}
      href={uiInternalPathUrl}
      betaBadgeLabel={betaBadgeLabel}
      betaBadgeTooltipContent={betaBadgeLabelTooltipContent}
    />
  );
}
