/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { CommonProps, EuiPanel } from '@elastic/eui';
import { CardHeader } from './components/card_header';

export interface ArtifactEntryCardProps extends CommonProps {
  item: {};
}

/**
 * Display Artifact Items (ex. Trusted App, Event Filter, etc) as a card
 */
export const ArtifactEntryCard = memo<ArtifactEntryCardProps>(({ item, ...commonProps }) => {
  return (
    <EuiPanel hasBorder={true} {...commonProps}>
      <CardHeader name={item.name} createdDate={item.createdDate} updatedDate={item.updatedDate} />
      <div>Sub header section</div>
      <div>Description</div>
      <div>conditions here</div>
    </EuiPanel>
  );
});

ArtifactEntryCard.displayName = 'ArtifactEntryCard';
