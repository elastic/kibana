/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiBadgeGroup, EuiBadge } from '@elastic/eui';
import { MonitorFilters } from '../monitors_overview/types';

export const ShowSelectedFilters = ({ filters }: { filters: MonitorFilters }) => {
  return (
    <EuiBadgeGroup gutterSize="xs">
      {Object.entries(filters).map(([key, filter]) => {
        if (!filter || !filter.length) {
          return null;
        }
        const values = filter
          .map((f: { label: string; value: string }) => f.label || f.value)
          .join(', ');

        return (
          <EuiBadge key={key}>
            {i18n.translate('xpack.synthetics.showSelectedFilters.monitorBadgeLabel', {
              defaultMessage: '{label}: {value}',
              values: { label: labels[key], value: values },
            })}
          </EuiBadge>
        );
      })}
    </EuiBadgeGroup>
  );
};

const labels: Record<string, string> = {
  monitorIds: i18n.translate('xpack.synthetics.showSelectedFilters.monitorIdLabel', {
    defaultMessage: 'Monitor',
  }),
  tags: i18n.translate('xpack.synthetics.showSelectedFilters.tagsLabel', {
    defaultMessage: 'Tags',
  }),
  locations: i18n.translate('xpack.synthetics.showSelectedFilters.locationsLabel', {
    defaultMessage: 'Location',
  }),
  monitorTypes: i18n.translate('xpack.synthetics.showSelectedFilters.monitorTypeLabel', {
    defaultMessage: 'Type',
  }),
  projects: i18n.translate('xpack.synthetics.showSelectedFilters.presetLabel', {
    defaultMessage: 'Project',
  }),
};
