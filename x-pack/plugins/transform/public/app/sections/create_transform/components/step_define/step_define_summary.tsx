/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, FC } from 'react';

import { i18n } from '@kbn/i18n';

import { EuiCodeBlock, EuiForm, EuiFormRow, EuiSpacer } from '@elastic/eui';

import { dictionaryToArray } from '../../../../../../common/types/common';

import { useAppDependencies, useToastNotifications } from '../../../../app_dependencies';
import {
  getPivotQuery,
  getPivotPreviewDevConsoleStatement,
  getPreviewTransformRequestBody,
  isDefaultQuery,
  isMatchAllQuery,
} from '../../../../common';
import { usePivotData } from '../../../../hooks/use_pivot_data';
import { SearchItems } from '../../../../hooks/use_search_items';

import { AggListSummary } from '../aggregation_list';
import { GroupByListSummary } from '../group_by_list';

import { StepDefineExposedState } from './common';

interface Props {
  formState: StepDefineExposedState;
  searchItems: SearchItems;
}

export const StepDefineSummary: FC<Props> = ({
  formState: { searchString, searchQuery, groupByList, aggList },
  searchItems,
}) => {
  const {
    ml: { DataGrid },
  } = useAppDependencies();
  const toastNotifications = useToastNotifications();
  const pivotAggsArr = dictionaryToArray(aggList);
  const pivotGroupByArr = dictionaryToArray(groupByList);
  const pivotQuery = getPivotQuery(searchQuery);

  const previewRequest = getPreviewTransformRequestBody(
    searchItems.indexPattern.title,
    pivotQuery,
    pivotGroupByArr,
    pivotAggsArr
  );

  const pivotPreviewProps = usePivotData(
    searchItems.indexPattern.title,
    pivotQuery,
    aggList,
    groupByList
  );

  const isModifiedQuery =
    typeof searchString === 'undefined' &&
    !isDefaultQuery(pivotQuery) &&
    !isMatchAllQuery(pivotQuery);

  return (
    <div data-test-subj="transformStepDefineSummary">
      <EuiForm>
        {searchItems.savedSearch === undefined && (
          <Fragment>
            <EuiFormRow
              label={i18n.translate('xpack.transform.stepDefineSummary.indexPatternLabel', {
                defaultMessage: 'Index pattern',
              })}
            >
              <span>{searchItems.indexPattern.title}</span>
            </EuiFormRow>
            {typeof searchString === 'string' && (
              <EuiFormRow
                label={i18n.translate('xpack.transform.stepDefineSummary.queryLabel', {
                  defaultMessage: 'Query',
                })}
              >
                <span>{searchString}</span>
              </EuiFormRow>
            )}
            {isModifiedQuery && (
              <EuiFormRow
                label={i18n.translate('xpack.transform.stepDefineSummary.queryCodeBlockLabel', {
                  defaultMessage: 'Query',
                })}
              >
                <EuiCodeBlock
                  language="js"
                  fontSize="s"
                  paddingSize="s"
                  color="light"
                  overflowHeight={300}
                  isCopyable
                >
                  {JSON.stringify(pivotQuery, null, 2)}
                </EuiCodeBlock>
              </EuiFormRow>
            )}
          </Fragment>
        )}

        {searchItems.savedSearch !== undefined && searchItems.savedSearch.id !== undefined && (
          <EuiFormRow
            label={i18n.translate('xpack.transform.stepDefineSummary.savedSearchLabel', {
              defaultMessage: 'Saved search',
            })}
          >
            <span>{searchItems.savedSearch.title}</span>
          </EuiFormRow>
        )}

        <EuiFormRow
          label={i18n.translate('xpack.transform.stepDefineSummary.groupByLabel', {
            defaultMessage: 'Group by',
          })}
        >
          <GroupByListSummary list={groupByList} />
        </EuiFormRow>

        <EuiFormRow
          label={i18n.translate('xpack.transform.stepDefineSummary.aggregationsLabel', {
            defaultMessage: 'Aggregations',
          })}
        >
          <AggListSummary list={aggList} />
        </EuiFormRow>

        <EuiSpacer size="m" />
        <DataGrid
          {...pivotPreviewProps}
          copyToClipboard={getPivotPreviewDevConsoleStatement(previewRequest)}
          copyToClipboardDescription={i18n.translate(
            'xpack.transform.pivotPreview.copyClipboardTooltip',
            {
              defaultMessage: 'Copy Dev Console statement of the pivot preview to the clipboard.',
            }
          )}
          dataTestSubj="transformPivotPreview"
          title={i18n.translate('xpack.transform.pivotPreview.PivotPreviewTitle', {
            defaultMessage: 'Transform pivot preview',
          })}
          toastNotifications={toastNotifications}
        />
      </EuiForm>
    </div>
  );
};
