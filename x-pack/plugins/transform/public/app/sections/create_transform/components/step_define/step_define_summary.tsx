/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, FC } from 'react';

import { i18n } from '@kbn/i18n';

import {
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiText,
} from '@elastic/eui';

import { getPivotQuery, isDefaultQuery, isMatchAllQuery } from '../../../../common';
import { PivotPreview } from '../../../../components/pivot_preview';
import { SearchItems } from '../../../../hooks/use_search_items';

import { AggListSummary } from '../aggregation_list';
import { GroupByListSummary } from '../group_by_list';

import { StepDefineExposedState } from './step_define_form';

interface Props {
  formState: StepDefineExposedState;
  searchItems: SearchItems;
}

export const StepDefineSummary: FC<Props> = ({
  formState: { searchString, searchQuery, groupByList, aggList },
  searchItems,
}) => {
  const pivotQuery = getPivotQuery(searchQuery);

  return (
    <EuiFlexGroup>
      <EuiFlexItem grow={false} style={{ minWidth: '420px' }}>
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
                {typeof searchString === 'undefined' &&
                  !isDefaultQuery(pivotQuery) &&
                  !isMatchAllQuery(pivotQuery) && (
                    <EuiFormRow
                      label={i18n.translate(
                        'xpack.transform.stepDefineSummary.queryCodeBlockLabel',
                        {
                          defaultMessage: 'Query',
                        }
                      )}
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
          </EuiForm>
        </div>
      </EuiFlexItem>

      <EuiFlexItem>
        <EuiText>
          <PivotPreview
            aggs={aggList}
            groupBy={groupByList}
            indexPatternTitle={searchItems.indexPattern.title}
            query={pivotQuery}
          />
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
