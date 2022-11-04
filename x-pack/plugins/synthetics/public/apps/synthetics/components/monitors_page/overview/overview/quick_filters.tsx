/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFilterGroup, EuiFilterButton } from '@elastic/eui';
import { useGetUrlParams, useUrlParams } from '../../../../hooks';

export const QuickFilters = () => {
  const { statusFilter } = useGetUrlParams();
  const [_, updateUrlParams] = useUrlParams();

  const handleFilterUpdate = (monitorStatus: string) => {
    return () => {
      updateUrlParams({ statusFilter: statusFilter !== monitorStatus ? monitorStatus : undefined });
    };
  };
  return (
    <EuiFilterGroup>
      <EuiFilterButton hasActiveFilters={statusFilter === 'up'} onClick={handleFilterUpdate('up')}>
        {UP_LABEL}
      </EuiFilterButton>
      <EuiFilterButton
        hasActiveFilters={statusFilter === 'down'}
        onClick={handleFilterUpdate('down')}
      >
        {DOWN_LABEL}
      </EuiFilterButton>
      <EuiFilterButton
        hasActiveFilters={statusFilter === 'disabled'}
        onClick={handleFilterUpdate('disabled')}
      >
        {DISABLED_LABEL}
      </EuiFilterButton>
    </EuiFilterGroup>
  );
};

const DOWN_LABEL = i18n.translate('xpack.synthetics.overview.status.filters.down', {
  defaultMessage: 'Down',
});

const UP_LABEL = i18n.translate('xpack.synthetics.overview.status.filters.up', {
  defaultMessage: 'Up',
});

const DISABLED_LABEL = i18n.translate('xpack.synthetics.overview.status.filters.disabled', {
  defaultMessage: 'Disabled',
});
