/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, Fragment, memo, useEffect, useState } from 'react';
import { EuiCallOut, EuiFormRow, EuiPanel, EuiSpacer, EuiText } from '@elastic/eui';
// @ts-ignore no declaration
import { LEFT_ALIGNMENT, CENTER_ALIGNMENT, SortableProperties } from '@elastic/eui/lib/services';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { FieldSelectionItem } from '../../../../common/analytics';
// @ts-ignore could not find declaration file
import { CustomSelectionTable } from '../../../../../components/custom_selection_table';

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

const checkboxDisabledCheck = (item: FieldSelectionItem) =>
  (item.is_included === false && !item.reason?.includes('in excludes list')) ||
  item.is_required === true;

export const MemoizedAnalysisFieldsTable: FC<{
  excludes: string[];
  loadingItems: boolean;
  setFormState: any;
  tableItems: FieldSelectionItem[];
}> = memo(
  ({ excludes, loadingItems, setFormState, tableItems }) => {
    const [sortableProperties, setSortableProperties] = useState();
    const [currentSelection, setCurrentSelection] = useState<any[]>([]);

    useEffect(() => {
      if (excludes.length > 0) {
        setCurrentSelection(excludes);
      }
    }, [tableItems]);

    // Only set form state on unmount to prevent re-renders due to props changing if exludes was updated on each selection
    useEffect(() => {
      return () => {
        setFormState({ excludes: currentSelection });
      };
    }, [currentSelection]);

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
          <EuiPanel paddingSize="m" data-test-subj="mlAnalyticsCreateJobWizardExcludesSelect">
            <CustomSelectionTable
              data-test-subj="mlAnalyticsCreationAnalysisFieldsTable"
              checkboxDisabledCheck={checkboxDisabledCheck}
              columns={columns}
              filters={filters}
              items={tableItems}
              itemsPerPage={5}
              onTableChange={(selection: FieldSelectionItem[]) => {
                setCurrentSelection(selection);
              }}
              selectedIds={currentSelection}
              singleSelection={false}
              sortableProperties={sortableProperties}
              tableItemId={'name'}
            />
          </EuiPanel>
        )}
        <EuiSpacer />
      </Fragment>
    );
  },
  (prevProps, nextProps) => prevProps.tableItems.length === nextProps.tableItems.length
);
