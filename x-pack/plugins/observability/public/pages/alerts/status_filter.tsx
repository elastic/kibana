/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFilterButton, EuiFilterGroup } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import type { AlertStatus } from '../../../common/typings';

export interface StatusFilterProps {
  status: AlertStatus;
  onChange: (value: AlertStatus) => void;
}

export function StatusFilter({ status = 'open', onChange }: StatusFilterProps) {
  return (
    <EuiFilterGroup
      aria-label={i18n.translate('xpack.observability.alerts.statusFilterAriaLabel', {
        defaultMessage: 'Filter alerts by open and closed status',
      })}
    >
      <EuiFilterButton
        data-test-subj="StatusFilter open button"
        hasActiveFilters={status === 'open'}
        onClick={() => onChange('open')}
        withNext={true}
      >
        {i18n.translate('xpack.observability.alerts.statusFilter.openButtonLabel', {
          defaultMessage: 'Open',
        })}
      </EuiFilterButton>
      <EuiFilterButton
        data-test-subj="StatusFilter closed button"
        hasActiveFilters={status === 'closed'}
        onClick={() => onChange('closed')}
        withNext={true}
      >
        {i18n.translate('xpack.observability.alerts.statusFilter.closedButtonLabel', {
          defaultMessage: 'Closed',
        })}
      </EuiFilterButton>
      <EuiFilterButton
        data-test-subj="StatusFilter all button"
        hasActiveFilters={status === 'all'}
        onClick={() => onChange('all')}
      >
        {i18n.translate('xpack.observability.alerts.statusFilter.allButtonLabel', {
          defaultMessage: 'All',
        })}
      </EuiFilterButton>
    </EuiFilterGroup>
  );
}
