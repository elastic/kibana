/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, Fragment } from 'react';
import {
  EuiFormRow,
  EuiInMemoryTable,
  EuiPanel,
  EuiSearchBarProps,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FieldSelectionItem } from '../../../../common/analytics';

const columns: any = [
  {
    field: 'name',
    name: i18n.translate('xpack.ml.dataframe.analytics.create.analyticsTable.fieldNameColumn', {
      defaultMessage: 'Field name',
    }),
    dataType: 'string',
    sortable: true,
    'data-test-subj': 'mlAnalyticsFieldNameCell',
  },
  {
    field: 'mapping_types',
    name: i18n.translate('xpack.ml.dataframe.analytics.create.analyticsTable.mappingColumn', {
      defaultMessage: 'Mapping',
    }),
    render: (mappings: string[]) => mappings.join(', '),
    sortable: false,
    'data-test-subj': 'mlAnalyticsMappingCell',
  },
  {
    field: 'is_included',
    name: i18n.translate('xpack.ml.dataframe.analytics.create.analyticsTable.isIncludedColumn', {
      defaultMessage: 'Is included',
    }),
    sortable: true,
    dataType: 'boolean',
    'data-test-subj': 'mlAnalyticsIsIncludedCell',
  },
  {
    field: 'is_required',
    name: i18n.translate('xpack.ml.dataframe.analytics.create.analyticsTable.isRequiredColumn', {
      defaultMessage: 'Is required',
    }),
    sortable: true,
    dataType: 'boolean',
    'data-test-subj': 'mlAnalyticsIsRequiredCell',
  },
  {
    field: 'reason',
    name: i18n.translate('xpack.ml.dataframe.analytics.create.analyticsTable.reasonColumn', {
      defaultMessage: 'Reason',
    }),
    dataType: 'string',
    sortable: false,
    'data-test-subj': 'mlAnalyticsReasonCell',
  },
];

export const AnalysisFieldsTable: FC<{
  loadingItems: boolean;
  setFormState: any;
  tableItems: any;
}> = ({ loadingItems, setFormState, tableItems }) => {
  const message =
    tableItems.length === 0
      ? i18n.translate('xpack.ml.dataframe.analytics.create.excludesFieldsTableMessage', {
          defaultMessage: 'Additional data required to load analysis fields.',
        })
      : undefined;

  const selection = {
    selectable: (fieldData: FieldSelectionItem) =>
      fieldData.is_included === true && fieldData.is_required === false,
    selectableMessage: (selectable: boolean, item: FieldSelectionItem) =>
      !selectable ? `${item.name} is already excluded from analysis or is a required field` : '',
    onSelectionChange: (currentSelection: FieldSelectionItem[]) => {
      setFormState({ excludes: currentSelection.map(item => item.name) });
    },
  };

  const search: EuiSearchBarProps = {
    box: {
      incremental: true,
    },
    filters: [
      {
        type: 'field_value_selection',
        field: 'is_included',
        name: i18n.translate('ml.dataframe.analytics.create.excludedFilterLabel', {
          defaultMessage: 'Is included',
        }),
        multiSelect: false,
        options: [
          {
            value: true,
            view: (
              <EuiText grow={false}>
                {i18n.translate('ml.dataframe.analytics.create.isIncludedOption', {
                  defaultMessage: 'Yes',
                })}
              </EuiText>
            ),
          },
          {
            value: false,
            view: (
              <EuiText grow={false}>
                {i18n.translate('ml.dataframe.analytics.create.isNotIncludedOption', {
                  defaultMessage: 'No',
                })}
              </EuiText>
            ),
          },
        ],
      },
    ],
  };

  return (
    <Fragment>
      <EuiFormRow
        label={i18n.translate('xpack.ml.dataframe.analytics.create.excludedFieldsLabel', {
          defaultMessage: 'Excluded fields',
        })}
        helpText={i18n.translate(
          'xpack.ml.dataframe.analytics.create.excludedFieldsLabelHelpText',
          {
            defaultMessage: 'From included fields, select fields to exclude from analysis.',
          }
        )}
      >
        <Fragment />
      </EuiFormRow>
      <EuiPanel paddingSize="m">
        <EuiInMemoryTable
          columns={columns}
          data-test-subj="mlAnalyticsCreationAnalysisFieldsTable"
          isSelectable={true}
          itemId="name"
          items={tableItems}
          loading={loadingItems}
          message={message}
          pagination={{
            pageSizeOptions: [5, 10],
          }}
          search={search}
          selection={selection}
          sorting={{
            sort: {
              field: 'name',
              direction: 'desc',
            },
          }}
        />
      </EuiPanel>
      <EuiSpacer />
    </Fragment>
  );
};
