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

const ITEMS_PER_PAGE = 5;

const columns = [
  {
    id: 'checkbox',
    isCheckbox: true,
    textOnly: false,
    width: '32px',
  },
  {
    label: i18n.translate('xpack.ml.dataframe.analytics.create.analyticsTable.fieldNameColumn', {
      defaultMessage: 'Field name',
    }),
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

const checkboxDisabledCheck = (item: FieldSelectionItem) => item.is_required === true;

export const AnalysisFieldsTable: FC<{
  includes: string[];
  loadingItems: boolean;
  setFormState: React.Dispatch<React.SetStateAction<any>>;
  tableItems: FieldSelectionItem[];
}> = ({ includes, loadingItems, setFormState, tableItems }) => {
  const [sortableProperties, setSortableProperties] = useState();
  const [currentPageIndex, setCurrentPageIndex] = useState<number>(0);

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
      type: 'field_value_selection',
      field: 'is_included',
      name: i18n.translate('xpack.ml.dataframe.analytics.create.excludedFilterLabel', {
        defaultMessage: 'Is included',
      }),
      multiSelect: false,
      options: [
        {
          value: true,
          view: (
            <EuiText grow={false}>
              {i18n.translate('xpack.ml.dataframe.analytics.create.isIncludedOption', {
                defaultMessage: 'Yes',
              })}
            </EuiText>
          ),
        },
        {
          value: false,
          view: (
            <EuiText grow={false}>
              {i18n.translate('xpack.ml.dataframe.analytics.create.isNotIncludedOption', {
                defaultMessage: 'No',
              })}
            </EuiText>
          ),
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
      >
        <Fragment />
      </EuiFormRow>
      {tableItems.length > 0 && (
        <EuiText size="xs">
          {includes.length}
          {i18n.translate('xpack.ml.dataframe.analytics.create.includedFieldsCount', {
            defaultMessage: ' fields included in the analysis',
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
            currentPage={currentPageIndex}
            data-test-subj="mlAnalyticsCreationAnalysisFieldsTable"
            checkboxDisabledCheck={checkboxDisabledCheck}
            columns={columns}
            filters={filters}
            items={tableItems}
            itemsPerPage={ITEMS_PER_PAGE}
            onTableChange={(selection: FieldSelectionItem[]) => {
              setFormState({ includes: selection });
            }}
            selectedIds={includes}
            setCurrentPage={setCurrentPageIndex}
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
