/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadgeGroup, EuiBadge } from '@elastic/eui';

export interface BadgeListProps {
  badges: React.ReactNode[];
  maxBadgesToDisplay?: number;
}

export const BadgeList = ({ badges, maxBadgesToDisplay }: BadgeListProps) => {
  const maxBadges = maxBadgesToDisplay ?? 3;
  if (badges.length === 0) {
    return <></>;
  }

  const badgesToDisplay = badges.slice(0, maxBadges);
  return (
    <EuiBadgeGroup gutterSize="s" css={{ width: '100%' }}>
      {badgesToDisplay.map((badge) => badge)}
      {badges.length > maxBadges && (
        <EuiBadge color="hollow">+{badges.length - maxBadges}</EuiBadge>
      )}
    </EuiBadgeGroup>
  );
};
