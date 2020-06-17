/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFilterButton, EuiFilterGroup } from '@elastic/eui';
import React, { useCallback, useState } from 'react';
import { Status } from '../../../../../common/detection_engine/schemas/common/schemas';
import * as i18n from '../translations';

export const FILTER_OPEN: Status = 'open';
export const FILTER_CLOSED: Status = 'closed';
export const FILTER_IN_PROGRESS: Status = 'in-progress';

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

  const onClickInProgressFilterCallback = useCallback(() => {
    setFilterGroup(FILTER_IN_PROGRESS);
    onFilterGroupChanged(FILTER_IN_PROGRESS);
  }, [setFilterGroup, onFilterGroupChanged]);

  return (
    <EuiFilterGroup>
      <EuiFilterButton
        data-test-subj="openAlerts"
        hasActiveFilters={filterGroup === FILTER_OPEN}
        onClick={onClickOpenFilterCallback}
        withNext
      >
        {i18n.OPEN_ALERTS}
      </EuiFilterButton>

      <EuiFilterButton
        data-test-subj="inProgressAlerts"
        hasActiveFilters={filterGroup === FILTER_IN_PROGRESS}
        onClick={onClickInProgressFilterCallback}
        withNext
      >
        {i18n.IN_PROGRESS_ALERTS}
      </EuiFilterButton>

      <EuiFilterButton
        data-test-subj="closedAlerts"
        hasActiveFilters={filterGroup === FILTER_CLOSED}
        onClick={onClickCloseFilterCallback}
      >
        {i18n.CLOSED_ALERTS}
      </EuiFilterButton>
    </EuiFilterGroup>
  );
};

export const AlertsTableFilterGroup = React.memo(AlertsTableFilterGroupComponent);
