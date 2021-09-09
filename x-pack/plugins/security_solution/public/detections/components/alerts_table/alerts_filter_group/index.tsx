/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonGroup, EuiButtonGroupOptionProps } from '@elastic/eui';
import React, { useCallback } from 'react';
import { Status } from '../../../../../common/detection_engine/schemas/common/schemas';
import * as i18n from '../translations';

export const FILTER_OPEN: Status = 'open';
export const FILTER_CLOSED: Status = 'closed';
export const FILTER_ACKNOWLEDGED: Status = 'acknowledged';

interface Props {
  status: Status;
  onFilterGroupChanged: (filterGroup: Status) => void;
}

const AlertsTableFilterGroupComponent: React.FC<Props> = ({
  status = FILTER_OPEN,
  onFilterGroupChanged,
}) => {
  const options: EuiButtonGroupOptionProps[] = [
    {
      id: 'open',
      label: i18n.OPEN_ALERTS,
      'data-test-subj': 'openAlerts',
    },
    {
      id: 'acknowledged',
      label: i18n.ACKNOWLEDGED_ALERTS,
      'data-test-subj': 'acknowledgedAlerts',
    },
    {
      id: 'closed',
      label: i18n.CLOSED_ALERTS,
      'data-test-subj': 'closedAlerts',
    },
  ];

  const onChange = useCallback(
    (id: string) => {
      onFilterGroupChanged(id as Status);
    },
    [onFilterGroupChanged]
  );

  return (
    <EuiButtonGroup
      legend="filter status"
      color="primary"
      options={options}
      idSelected={status}
      data-test-subj="alerts-table-filter-group"
      onChange={onChange}
    />
  );
};

export const AlertsTableFilterGroup = React.memo(AlertsTableFilterGroupComponent);
