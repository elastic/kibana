/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { Status } from '@kbn/cases-components/src/status/status';
import { CaseStatuses } from '../../../common/types/domain';

import type { MultiSelectFilterOption } from './multi_select_filter';
import { MultiSelectFilter } from './multi_select_filter';
import * as i18n from './translations';

interface Props {
  countClosedCases: number | null;
  countInProgressCases: number | null;
  countOpenCases: number | null;
  hiddenStatuses?: CaseStatuses[];
  onChange: (params: { filterId: string; selectedOptionKeys: string[] }) => void;
  selectedOptionKeys: string[];
}

const caseStatuses = [
  { key: CaseStatuses.open, label: i18n.STATUS_OPEN },
  { key: CaseStatuses['in-progress'], label: i18n.STATUS_IN_PROGRESS },
  { key: CaseStatuses.closed, label: i18n.STATUS_CLOSED },
];

export const StatusFilterComponent = ({
  countClosedCases,
  countInProgressCases,
  countOpenCases,
  hiddenStatuses = [],
  onChange,
  selectedOptionKeys,
}: Props) => {
  const stats = useMemo(
    () => ({
      [CaseStatuses.open]: countOpenCases ?? 0,
      [CaseStatuses['in-progress']]: countInProgressCases ?? 0,
      [CaseStatuses.closed]: countClosedCases ?? 0,
    }),
    [countClosedCases, countInProgressCases, countOpenCases]
  );
  const options = useMemo(
    () =>
      [...caseStatuses].filter((status) => !hiddenStatuses.includes(status.key)) as Array<
        MultiSelectFilterOption<string, CaseStatuses>
      >,
    [hiddenStatuses]
  );
  const renderOption = (option: MultiSelectFilterOption<string, CaseStatuses>) => {
    const selectedStatus = option.key;
    return (
      <EuiFlexGroup gutterSize="xs" alignItems={'center'} responsive={false}>
        <EuiFlexItem grow={1}>
          <span>
            <Status status={selectedStatus} />
          </span>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>{` (${stats[selectedStatus]})`}</EuiFlexItem>
      </EuiFlexGroup>
    );
  };
  return (
    <MultiSelectFilter
      buttonLabel={i18n.STATUS}
      id={'status'}
      onChange={onChange}
      options={options}
      renderOption={renderOption}
      selectedOptionKeys={selectedOptionKeys}
      isLoading={false}
    />
  );
};

StatusFilterComponent.displayName = 'StatusFilterComponent';

export const StatusFilter = React.memo(StatusFilterComponent);
