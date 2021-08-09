/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFilterButton, EuiFilterGroup } from '@elastic/eui';
import { rgba } from 'polished';
import React, { useCallback, useState } from 'react';
import styled from 'styled-components';
import { Status } from '../../../../../common/detection_engine/schemas/common/schemas';
import * as i18n from '../translations';

export const FILTER_OPEN: Status = 'open';
export const FILTER_CLOSED: Status = 'closed';
export const FILTER_ACKNOWLEDGED: Status = 'acknowledged';

const StatusFilterButton = styled(EuiFilterButton)<{ $isActive: boolean }>`
  background: ${({ $isActive, theme }) => ($isActive ? theme.eui.euiColorPrimary : '')};
`;

const StatusFilterGroup = styled(EuiFilterGroup)`
  background: ${({ theme }) => rgba(theme.eui.euiColorPrimary, 0.2)};
  .euiButtonEmpty--ghost:enabled:focus {
    background-color: ${({ theme }) => theme.eui.euiColorPrimary};
  }
`;

interface Props {
  onFilterGroupChanged: (filterGroup: Status) => void;
}

const AlertsTableFilterGroupComponent: React.FC<Props> = ({ onFilterGroupChanged }) => {
  const [filterGroup, setFilterGroup] = useState<Status>(FILTER_OPEN);

  const onClickOpenFilterCallback = useCallback(() => {
    setFilterGroup(FILTER_OPEN);
    onFilterGroupChanged(FILTER_OPEN);
  }, [setFilterGroup, onFilterGroupChanged]);

  const onClickCloseFilterCallback = useCallback(() => {
    setFilterGroup(FILTER_CLOSED);
    onFilterGroupChanged(FILTER_CLOSED);
  }, [setFilterGroup, onFilterGroupChanged]);

  const onClickAcknowledgedFilterCallback = useCallback(() => {
    setFilterGroup(FILTER_ACKNOWLEDGED);
    onFilterGroupChanged(FILTER_ACKNOWLEDGED);
  }, [setFilterGroup, onFilterGroupChanged]);

  return (
    <StatusFilterGroup data-test-subj="alerts-table-filter-group">
      <StatusFilterButton
        data-test-subj="openAlerts"
        hasActiveFilters={filterGroup === FILTER_OPEN}
        $isActive={filterGroup === FILTER_OPEN}
        onClick={onClickOpenFilterCallback}
        withNext
        color={filterGroup === FILTER_OPEN ? 'ghost' : 'primary'}
      >
        {i18n.OPEN_ALERTS}
      </StatusFilterButton>

      <StatusFilterButton
        data-test-subj="acknowledgedAlerts"
        hasActiveFilters={filterGroup === FILTER_ACKNOWLEDGED}
        $isActive={filterGroup === FILTER_ACKNOWLEDGED}
        onClick={onClickAcknowledgedFilterCallback}
        withNext
        color={filterGroup === FILTER_ACKNOWLEDGED ? 'ghost' : 'primary'}
      >
        {i18n.ACKNOWLEDGED_ALERTS}
      </StatusFilterButton>

      <StatusFilterButton
        data-test-subj="closedAlerts"
        hasActiveFilters={filterGroup === FILTER_CLOSED}
        $isActive={filterGroup === FILTER_CLOSED}
        onClick={onClickCloseFilterCallback}
        color={filterGroup === FILTER_CLOSED ? 'ghost' : 'primary'}
      >
        {i18n.CLOSED_ALERTS}
      </StatusFilterButton>
    </StatusFilterGroup>
  );
};

export const AlertsTableFilterGroup = React.memo(AlertsTableFilterGroupComponent);
