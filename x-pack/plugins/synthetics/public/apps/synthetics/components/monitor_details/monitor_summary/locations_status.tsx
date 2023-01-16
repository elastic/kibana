/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiBadge, EuiBadgeGroup, EuiIcon, EuiLoadingSpinner } from '@elastic/eui';
import { useTheme } from '@kbn/observability-plugin/public';
import { useStatusByLocation } from '../../../hooks/use_status_by_location';

export const LocationsStatus = ({ configId }: { configId?: string }) => {
  const { locations, loading } = useStatusByLocation(configId);

  const theme = useTheme();

  if (loading && !locations) {
    return <EuiLoadingSpinner />;
  }

  return (
    <EuiBadgeGroup>
      {locations.map((loc) => (
        <EuiBadge
          key={loc.observer?.geo?.name}
          iconType={() => (
            <EuiIcon
              size="s"
              type="dot"
              color={(loc.summary?.down ?? 0) > 0 ? theme.eui.euiColorVis9 : theme.eui.euiColorVis0}
            />
          )}
          color="hollow"
        >
          {loc.observer?.geo?.name}
        </EuiBadge>
      ))}
    </EuiBadgeGroup>
  );
};
