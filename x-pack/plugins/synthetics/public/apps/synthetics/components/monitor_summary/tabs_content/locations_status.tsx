/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiBadge, EuiBadgeGroup, EuiIcon, EuiLoadingSpinner } from '@elastic/eui';
import { useStatusByLocation } from '../hooks/use_status_by_location';

export const LocationsStatus = () => {
  const { locations, loading } = useStatusByLocation();

  if (loading) {
    return <EuiLoadingSpinner />;
  }

  return (
    <EuiBadgeGroup>
      {locations.map((loc) => (
        <EuiBadge
          iconType={() => (
            <EuiIcon type="dot" color={(loc.summary?.down ?? 0) > 0 ? 'danger' : 'success'} />
          )}
          color="hollow"
        >
          {loc.observer?.geo?.name}
        </EuiBadge>
      ))}
    </EuiBadgeGroup>
  );
};
