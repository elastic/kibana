/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonGroup, EuiButtonGroupOptionProps } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import type { AlertWorkflowStatus } from '../../../../../common/typings';

export interface WorkflowStatusFilterProps {
  status: AlertWorkflowStatus;
  onChange: (value: AlertWorkflowStatus) => void;
}

const options: Array<EuiButtonGroupOptionProps & { id: AlertWorkflowStatus }> = [
  {
    id: 'open',
    label: i18n.translate('xpack.observability.alerts.workflowStatusFilter.openButtonLabel', {
      defaultMessage: 'Open',
    }),
    'data-test-subj': 'workflowStatusFilterButton-open',
  },
  {
    id: 'acknowledged',
    label: i18n.translate(
      'xpack.observability.alerts.workflowStatusFilter.acknowledgedButtonLabel',
      {
        defaultMessage: 'Acknowledged',
      }
    ),
    'data-test-subj': 'workflowStatusFilterButton-acknowledged',
  },
  {
    id: 'closed',
    label: i18n.translate('xpack.observability.alerts.workflowStatusFilter.closedButtonLabel', {
      defaultMessage: 'Closed',
    }),
    'data-test-subj': 'workflowStatusFilterButton-closed',
  },
];

export function WorkflowStatusFilter({ status = 'open', onChange }: WorkflowStatusFilterProps) {
  return (
    <EuiButtonGroup
      legend="Filter by"
      color="primary"
      options={options}
      idSelected={status}
      onChange={(id) => onChange(id as AlertWorkflowStatus)}
    />
  );
}
