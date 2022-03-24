/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment, FC } from 'react';

import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';

import { EuiBadge, EuiCodeBlock, EuiForm, EuiFormRow, EuiSpacer, EuiText } from '@elastic/eui';

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
import { TRANSFORM_FUNCTION } from '../../../../../../common/constants';
import { isLatestPartialRequest } from './common/types';

interface Props {
  formState: StepDefineExposedState;
  searchItems: SearchItems;
}

export const StepDefineSummary: FC<Props> = ({
  formState: {
    runtimeMappings,
    searchString,
    searchQuery,
    groupByList,
    aggList,
    transformFunction,
    previewRequest: partialPreviewRequest,
    validationStatus,
  },
  searchItems,
}) => {
  const {
    ml: { DataGrid },
  } = useAppDependencies();
  const toastNotifications = useToastNotifications();

  const pivotQuery = getPivotQuery(searchQuery);

  const previewRequest = getPreviewTransformRequestBody(
    searchItems.indexPattern.title,
    pivotQuery,
    partialPreviewRequest,
    runtimeMappings
  );

  const pivotPreviewProps = usePivotData(
    searchItems.indexPattern.title,
    pivotQuery,
    validationStatus,
    partialPreviewRequest,
    runtimeMappings
  );

  const isModifiedQuery =
    typeof searchString === 'undefined' &&
    !isDefaultQuery(pivotQuery) &&
    !isMatchAllQuery(pivotQuery);

  let uniqueKeys: string[] = [];
  let sortField = '';
  if (isLatestPartialRequest(previewRequest)) {
    uniqueKeys = previewRequest.latest.unique_key;
    sortField = previewRequest.latest.sort;
  }

  return (
    <div data-test-subj="transformStepDefineSummary">
      <EuiForm>
        {searchItems.savedSearch === undefined && (
          <Fragment>
            <EuiFormRow
              label={i18n.translate('xpack.transform.stepDefineSummary.dataViewLabel', {
                defaultMessage: 'Data view',
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

        {transformFunction === TRANSFORM_FUNCTION.PIVOT ? (
          <>
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
          </>
        ) : (
          <>
            <EuiFormRow
              label={
                <FormattedMessage
                  id="xpack.transform.stepDefineForm.uniqueKeysLabel"
                  defaultMessage="Unique keys"
                />
              }
            >
              <>
                {uniqueKeys.map((k) => (
                  <EuiBadge color="hollow" key={k}>
                    {k}
                  </EuiBadge>
                ))}
              </>
            </EuiFormRow>

            <EuiFormRow
              label={
                <FormattedMessage
                  id="xpack.transform.stepDefineForm.sortLabel"
                  defaultMessage="Sort field"
                />
              }
            >
              <EuiText>{sortField}</EuiText>
            </EuiFormRow>
          </>
        )}

        <EuiSpacer size="m" />
        <DataGrid
          {...pivotPreviewProps}
          copyToClipboard={getPivotPreviewDevConsoleStatement(previewRequest)}
          copyToClipboardDescription={i18n.translate(
            'xpack.transform.pivotPreview.copyClipboardTooltip',
            {
              defaultMessage:
                'Copy Dev Console statement of the transform preview to the clipboard.',
            }
          )}
          dataTestSubj="transformPivotPreview"
          title={i18n.translate('xpack.transform.pivotPreview.transformPreviewTitle', {
            defaultMessage: 'Transform preview',
          })}
          toastNotifications={toastNotifications}
        />
      </EuiForm>
    </div>
  );
};
