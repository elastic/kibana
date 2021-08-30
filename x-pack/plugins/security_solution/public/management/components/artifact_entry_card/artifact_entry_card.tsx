/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { CommonProps, EuiHorizontalRule, EuiPanel } from '@elastic/eui';
import { CardHeader } from './components/card_header';

export interface ArtifactEntryCardProps<T extends {}> extends CommonProps {
  item: T;
}

/**
 * Display Artifact Items (ex. Trusted App, Event Filter, etc) as a card
 */
export const ArtifactEntryCard = memo<ArtifactEntryCardProps>(({ item, ...commonProps }) => {
  return (
    <EuiPanel hasBorder={true} {...commonProps} paddingSize="none">
      <EuiPanel hasBorder={false} borderRadius="none" hasShadow={false}>
        <CardHeader
          name={item.name}
          createdDate={item.createdDate}
          updatedDate={item.updatedDate}
        />
        <div>Sub header section</div>
        <div>Description</div>
      </EuiPanel>
      <EuiHorizontalRule margin="xs" />
      <EuiPanel hasBorder={false} borderRadius="none" hasShadow={false}>
        <div>{'conditions here'}</div>
      </EuiPanel>
    </EuiPanel>
  );
});

ArtifactEntryCard.displayName = 'ArtifactEntryCard';
