/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useMemo } from 'react';

import type { EuiBasicTableColumn } from '@elastic/eui';

import { EuiBasicTable, EuiSkeletonText, EuiSpacer, EuiText, EuiEmptyPrompt } from '@elastic/eui';

import { OBSERVABLE_TYPES_BUILTIN } from '../../../common/constants';
import type { Observable, ObservableType } from '../../../common/types/domain';
import type { CaseUI } from '../../../common/ui';
import * as i18n from './translations';
import { AddObservable } from './add_observable';
import { ObservableActionsPopoverButton } from './observable_actions_popover_button';
import { useGetCaseConfiguration } from '../../containers/configure/use_get_case_configuration';

const getColumns = (
  caseData: CaseUI,
  observableTypes: ObservableType[]
): Array<EuiBasicTableColumn<Observable>> => [
  {
    name: i18n.DATE_ADDED,
    field: 'createdAt',
    'data-test-subj': 'cases-observables-table-date-added',
    dataType: 'date',
  },
  {
    name: i18n.OBSERVABLE_TYPE,
    field: 'typeKey',
    'data-test-subj': 'cases-observables-table-type',
    render: (typeKey: string) =>
      observableTypes.find((observableType) => observableType.key === typeKey)?.label || '-',
  },
  {
    name: i18n.OBSERVABLE_VALUE,
    field: 'value',
    'data-test-subj': 'cases-observables-table-value',
  },
  {
    name: i18n.OBSERVABLE_ACTIONS,
    field: 'actions',
    'data-test-subj': 'cases-observables-table-actions',
    width: '120px',
    actions: [
      {
        name: i18n.OBSERVABLE_ACTIONS,
        render: (observable: Observable) => {
          if (!observable.id) {
            return <></>;
          }

          return <ObservableActionsPopoverButton caseData={caseData} observable={observable} />;
        },
      },
    ],
  },
];

const EmptyObservablesTable = ({ caseData }: { caseData: CaseUI }) => (
  <EuiEmptyPrompt
    title={<h3>{i18n.NO_OBSERVABLES}</h3>}
    data-test-subj="cases-observables-table-empty"
    titleSize="xs"
    actions={<AddObservable caseData={caseData} />}
  />
);

EmptyObservablesTable.displayName = 'EmptyObservablesTable';

export interface ObservablesTableProps {
  caseData: CaseUI;
  isLoading: boolean;
}

export const ObservablesTable = ({ caseData, isLoading }: ObservablesTableProps) => {
  const filesTableRowProps = useCallback(
    (observable: Observable) => ({
      'data-test-subj': `cases-observables-table-row-${observable.id}`,
    }),
    []
  );

  const { data: currentConfiguration, isLoading: loadingCaseConfigure } = useGetCaseConfiguration();

  const columns = useMemo(
    () =>
      getColumns(caseData, [...OBSERVABLE_TYPES_BUILTIN, ...currentConfiguration.observableTypes]),
    [caseData, currentConfiguration.observableTypes]
  );

  return isLoading || loadingCaseConfigure ? (
    <>
      <EuiSpacer size="l" />
      <EuiSkeletonText data-test-subj="cases-files-table-loading" lines={10} />
    </>
  ) : (
    <>
      {caseData.observables.length > 0 && (
        <>
          <EuiSpacer size="xl" />
          <EuiText size="xs" color="subdued" data-test-subj="cases-observables-table-results-count">
            {i18n.SHOWING_OBSERVABLES(caseData.observables.length)}
          </EuiText>
        </>
      )}
      <EuiSpacer size="s" />
      <EuiBasicTable
        tableCaption={i18n.OBSERVABLES_TABLE}
        items={caseData.observables}
        rowHeader="name"
        columns={columns}
        data-test-subj="cases-observables-table"
        noItemsMessage={<EmptyObservablesTable caseData={caseData} />}
        rowProps={filesTableRowProps}
      />
    </>
  );
};

ObservablesTable.displayName = 'ObservablesTable';
