/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiPanel } from '@elastic/eui';

export interface ArtifactEntryCardProps {
  item: {};
}

/**
 * Display Artifact Items (ex. Trusted App, Event Filter, etc) as a card
 */
export const ArtifactEntryCard = memo<ArtifactEntryCardProps>(() => {
  return <EuiPanel hasBorder={true}>{'card here'}</EuiPanel>;
});

ArtifactEntryCard.displayName = 'ArtifactEntryCard';
