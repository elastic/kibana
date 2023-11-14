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
import { statuses } from '../status';
import type { MultiSelectFilterOption } from './multi_select_filter';
import { MultiSelectFilter, mapToMultiSelectOption } from './multi_select_filter';
import * as i18n from './translations';

interface Props {
  countClosedCases: number | null;
  countInProgressCases: number | null;
  countOpenCases: number | null;
  hiddenStatuses?: CaseStatuses[];
  onChange: ({
    filterId,
    selectedOptionKeys,
  }: {
    filterId: string;
    selectedOptionKeys: string[];
  }) => void;
  selectedOptionKeys: string[];
}

const caseStatuses = Object.keys(statuses) as CaseStatuses[];

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
      mapToMultiSelectOption(
        [...caseStatuses].filter((status) => !hiddenStatuses.includes(status))
      ),
    [hiddenStatuses]
  );
  const renderOption = (option: MultiSelectFilterOption<CaseStatuses>) => {
    const selectedStatus = option.label;
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
    <MultiSelectFilter<CaseStatuses>
      buttonLabel={i18n.STATUS}
      id={'status'}
      onChange={onChange}
      options={options}
      renderOption={renderOption}
      selectedOptionKeys={selectedOptionKeys}
    />
  );
};

StatusFilterComponent.displayName = 'StatusFilterComponent';

export const StatusFilter = React.memo(StatusFilterComponent);
