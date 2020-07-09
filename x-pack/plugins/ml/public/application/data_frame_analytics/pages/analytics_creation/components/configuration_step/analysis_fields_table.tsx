/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, Fragment, useEffect, useState } from 'react';
import { EuiCallOut, EuiFormRow, EuiPanel, EuiSpacer, EuiText } from '@elastic/eui';
// @ts-ignore no declaration
import { LEFT_ALIGNMENT, CENTER_ALIGNMENT, SortableProperties } from '@elastic/eui/lib/services';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { FieldSelectionItem } from '../../../../common/analytics';
// @ts-ignore could not find declaration file
import { CustomSelectionTable } from '../../../../../components/custom_selection_table';

const minimumFieldsMessage = i18n.translate(
  'xpack.ml.dataframe.analytics.create.analysisFieldsTable.minimumFieldsMessage',
  {
    defaultMessage: 'At least one field must be selected.',
  }
);

const columns = [
  {
    id: 'checkbox',
    isCheckbox: true,
    textOnly: false,
    width: '32px',
  },
  {
    label: i18n.translate(
      'xpack.ml.dataframe.analytics.create.analysisFieldsTable.fieldNameColumn',
      {
        defaultMessage: 'Field name',
      }
    ),
    id: 'name',
    isSortable: true,
    alignment: LEFT_ALIGNMENT,
  },
  {
    id: 'mapping_types',
    label: i18n.translate('xpack.ml.dataframe.analytics.create.analyticsTable.mappingColumn', {
      defaultMessage: 'Mapping',
    }),
    isSortable: false,
    alignment: LEFT_ALIGNMENT,
  },
  {
    label: i18n.translate('xpack.ml.dataframe.analytics.create.analyticsTable.isIncludedColumn', {
      defaultMessage: 'Is included',
    }),
    id: 'is_included',
    alignment: LEFT_ALIGNMENT,
    isSortable: true,
    // eslint-disable-next-line @typescript-eslint/camelcase
    render: ({ is_included }: { is_included: boolean }) => (is_included ? 'Yes' : 'No'),
  },
  {
    label: i18n.translate('xpack.ml.dataframe.analytics.create.analyticsTable.isRequiredColumn', {
      defaultMessage: 'Is required',
    }),
    id: 'is_required',
    alignment: LEFT_ALIGNMENT,
    isSortable: true,
    // eslint-disable-next-line @typescript-eslint/camelcase
    render: ({ is_required }: { is_required: boolean }) => (is_required ? 'Yes' : 'No'),
  },
  {
    label: i18n.translate('xpack.ml.dataframe.analytics.create.analyticsTable.reasonColumn', {
      defaultMessage: 'Reason',
    }),
    id: 'reason',
    alignment: LEFT_ALIGNMENT,
    isSortable: false,
  },
];

const checkboxDisabledCheck = (item: FieldSelectionItem) =>
  item.is_required === true || (item.reason && item.reason.includes('unsupported type'));

export const AnalysisFieldsTable: FC<{
  dependentVariable?: string;
  includes: string[];
  loadingItems: boolean;
  setFormState: React.Dispatch<React.SetStateAction<any>>;
  tableItems: FieldSelectionItem[];
}> = ({ dependentVariable, includes, loadingItems, setFormState, tableItems }) => {
  const [sortableProperties, setSortableProperties] = useState();
  const [currentPaginationData, setCurrentPaginationData] = useState<{
    pageIndex: number;
    itemsPerPage: number;
  }>({ pageIndex: 0, itemsPerPage: 5 });
  const [minimumFieldsRequiredMessage, setMinimumFieldsRequiredMessage] = useState<
    undefined | string
  >(undefined);

  useEffect(() => {
    if (includes.length === 0 && tableItems.length > 0) {
      const includedFields: string[] = [];
      tableItems.forEach((field) => {
        if (field.is_included === true) {
          includedFields.push(field.name);
        }
      });
      setFormState({ includes: includedFields });
    } else if (includes.length > 0) {
      setFormState({ includes });
    }
    setMinimumFieldsRequiredMessage(undefined);
  }, [tableItems]);

  useEffect(() => {
    let sortablePropertyItems = [];
    const defaultSortProperty = 'name';

    sortablePropertyItems = [
      {
        name: 'name',
        getValue: (item: any) => item.name.toLowerCase(),
        isAscending: true,
      },
      {
        name: 'is_included',
        getValue: (item: any) => item.is_included,
        isAscending: true,
      },
      {
        name: 'is_required',
        getValue: (item: any) => item.is_required,
        isAscending: true,
      },
    ];
    const sortableProps = new SortableProperties(sortablePropertyItems, defaultSortProperty);

    setSortableProperties(sortableProps);
  }, []);

  const filters = [
    {
      type: 'field_value_toggle_group',
      field: 'is_included',
      items: [
        {
          value: true,
          name: i18n.translate('xpack.ml.dataframe.analytics.create.isIncludedOption', {
            defaultMessage: 'Is included',
          }),
        },
        {
          value: false,
          name: i18n.translate('xpack.ml.dataframe.analytics.create.isNotIncludedOption', {
            defaultMessage: 'Is not included',
          }),
        },
      ],
    },
  ];

  return (
    <Fragment>
      <EuiFormRow
        label={i18n.translate('xpack.ml.dataframe.analytics.create.includedFieldsLabel', {
          defaultMessage: 'Included fields',
        })}
        isInvalid={minimumFieldsRequiredMessage !== undefined}
        error={minimumFieldsRequiredMessage}
      >
        <Fragment />
      </EuiFormRow>
      {tableItems.length > 0 && minimumFieldsRequiredMessage === undefined && (
        <EuiText size="xs">
          {i18n.translate('xpack.ml.dataframe.analytics.create.includedFieldsCount', {
            defaultMessage:
              '{numFields, plural, one {# field} other {# fields}} included in the analysis',
            values: { numFields: includes.length },
          })}
        </EuiText>
      )}
      {tableItems.length === 0 && (
        <EuiCallOut
          title={i18n.translate('xpack.ml.dataframe.analytics.create.calloutTitle', {
            defaultMessage: 'Analysis fields not available',
          })}
        >
          <FormattedMessage
            id="xpack.ml.dataframe.analytics.create.calloutMessage"
            defaultMessage="Additional data required to load analysis fields."
          />
        </EuiCallOut>
      )}
      {tableItems.length > 0 && (
        <EuiPanel paddingSize="m" data-test-subj="mlAnalyticsCreateJobWizardIncludesSelect">
          <CustomSelectionTable
            currentPage={currentPaginationData.pageIndex}
            data-test-subj="mlAnalyticsCreationAnalysisFieldsTable"
            checkboxDisabledCheck={checkboxDisabledCheck}
            columns={columns}
            filters={filters}
            items={tableItems}
            itemsPerPage={currentPaginationData.itemsPerPage}
            onTableChange={(selection: string[]) => {
              // dependent variable must always be in includes
              if (
                dependentVariable !== undefined &&
                dependentVariable !== '' &&
                selection.length === 0
              ) {
                selection = [dependentVariable];
              }
              // If nothing selected show minimum fields required message and don't update form yet
              if (selection.length === 0) {
                setMinimumFieldsRequiredMessage(minimumFieldsMessage);
              } else {
                setMinimumFieldsRequiredMessage(undefined);
                setFormState({ includes: selection });
              }
            }}
            selectedIds={includes}
            setCurrentPaginationData={setCurrentPaginationData}
            singleSelection={false}
            sortableProperties={sortableProperties}
            tableItemId={'name'}
          />
        </EuiPanel>
      )}
      <EuiSpacer />
    </Fragment>
  );
};
