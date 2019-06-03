/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { ChangeEvent, Fragment, SFC, useContext, useEffect, useState } from 'react';

import { i18n } from '@kbn/i18n';

import { toastNotifications } from 'ui/notify';

import {
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormHelpText,
  EuiFormRow,
  EuiSpacer,
} from '@elastic/eui';

import { dictionaryToArray } from '../../../../common/types/common';
import { DropDown } from '../../components/aggregation_dropdown/dropdown';
import { AggListForm } from '../../components/aggregation_list';
import { GroupByListForm } from '../../components/group_by_list';
import { SourceIndexPreview } from '../../components/source_index_preview';
import { PivotPreview } from './pivot_preview';

import {
  AggName,
  DropDownLabel,
  getPivotQuery,
  isGroupByDateHistogram,
  isGroupByHistogram,
  isKibanaContext,
  KibanaContext,
  KibanaContextValue,
  PivotAggsConfig,
  PivotAggsConfigDict,
  PivotGroupByConfig,
  PivotGroupByConfigDict,
  SavedSearchQuery,
} from '../../common';

import { getPivotDropdownOptions } from './common';

export interface DefinePivotExposedState {
  aggList: PivotAggsConfigDict;
  groupByList: PivotGroupByConfigDict;
  search: string | SavedSearchQuery;
  valid: boolean;
}

const defaultSearch = '*';
const emptySearch = '';

export function getDefaultPivotState(kibanaContext: KibanaContextValue): DefinePivotExposedState {
  return {
    aggList: {} as PivotAggsConfigDict,
    groupByList: {} as PivotGroupByConfigDict,
    search:
      kibanaContext.currentSavedSearch.id !== undefined
        ? kibanaContext.combinedQuery
        : defaultSearch,
    valid: false,
  };
}
export function isAggNameConflict(
  aggName: AggName,
  aggList: PivotAggsConfigDict,
  groupByList: PivotGroupByConfigDict
) {
  if (aggList[aggName] !== undefined) {
    toastNotifications.addDanger(
      i18n.translate('xpack.ml.dataframe.definePivot.aggExistsErrorMessage', {
        defaultMessage: `An aggregation configuration with the name '{aggName}' already exists.`,
        values: { aggName },
      })
    );
    return true;
  }

  if (groupByList[aggName] !== undefined) {
    toastNotifications.addDanger(
      i18n.translate('xpack.ml.dataframe.definePivot.groupByExistsErrorMessage', {
        defaultMessage: `A group by configuration with the name '{aggName}' already exists.`,
        values: { aggName },
      })
    );
    return true;
  }

  let conflict = false;

  // check the new aggName against existing aggs and groupbys
  const aggNameSplit = aggName.split('.');
  let aggNameCheck: string;
  aggNameSplit.forEach(aggNamePart => {
    aggNameCheck = aggNameCheck === undefined ? aggNamePart : `${aggNameCheck}.${aggNamePart}`;
    if (aggList[aggNameCheck] !== undefined || groupByList[aggNameCheck] !== undefined) {
      toastNotifications.addDanger(
        i18n.translate('xpack.ml.dataframe.definePivot.nestedConflictErrorMessage', {
          defaultMessage: `Couldn't add configuration '{aggName}' because of a nesting conflict with '{aggNameCheck}'.`,
          values: { aggName, aggNameCheck },
        })
      );
      conflict = true;
    }
  });

  if (conflict) {
    return true;
  }

  // check all aggs against new aggName
  conflict = Object.keys(aggList).some(aggListName => {
    const aggListNameSplit = aggListName.split('.');
    let aggListNameCheck: string;
    return aggListNameSplit.some(aggListNamePart => {
      aggListNameCheck =
        aggListNameCheck === undefined ? aggListNamePart : `${aggListNameCheck}.${aggListNamePart}`;
      if (aggListNameCheck === aggName) {
        toastNotifications.addDanger(
          i18n.translate('xpack.ml.dataframe.definePivot.nestedAggListConflictErrorMessage', {
            defaultMessage: `Couldn't add configuration '{aggName}' because of a nesting conflict with '{aggListName}'.`,
            values: { aggName, aggListName },
          })
        );
        return true;
      }
      return false;
    });
  });

  if (conflict) {
    return true;
  }

  // check all group-bys against new aggName
  conflict = Object.keys(groupByList).some(groupByListName => {
    const groupByListNameSplit = groupByListName.split('.');
    let groupByListNameCheck: string;
    return groupByListNameSplit.some(groupByListNamePart => {
      groupByListNameCheck =
        groupByListNameCheck === undefined
          ? groupByListNamePart
          : `${groupByListNameCheck}.${groupByListNamePart}`;
      if (groupByListNameCheck === aggName) {
        toastNotifications.addDanger(
          i18n.translate('xpack.ml.dataframe.definePivot.nestedGroupByListConflictErrorMessage', {
            defaultMessage: `Couldn't add configuration '{aggName}' because of a nesting conflict with '{groupByListName}'.`,
            values: { aggName, groupByListName },
          })
        );
        return true;
      }
      return false;
    });
  });

  return conflict;
}

interface Props {
  overrides?: DefinePivotExposedState;
  onChange(s: DefinePivotExposedState): void;
}

export const DefinePivotForm: SFC<Props> = React.memo(({ overrides = {}, onChange }) => {
  const kibanaContext = useContext(KibanaContext);

  if (!isKibanaContext(kibanaContext)) {
    return null;
  }

  const indexPattern = kibanaContext.currentIndexPattern;

  const defaults = { ...getDefaultPivotState(kibanaContext), ...overrides };

  // The search filter
  const [search, setSearch] = useState(defaults.search);

  const addToSearch = (newSearch: string) => {
    const currentDisplaySearch = search === defaultSearch ? emptySearch : search;
    setSearch(`${currentDisplaySearch} ${newSearch}`.trim());
  };

  const searchHandler = (d: ChangeEvent<HTMLInputElement>) => {
    const newSearch = d.currentTarget.value === emptySearch ? defaultSearch : d.currentTarget.value;
    setSearch(newSearch);
  };

  // The list of selected group by fields
  const [groupByList, setGroupByList] = useState(defaults.groupByList);

  const {
    groupByOptions,
    groupByOptionsData,
    aggOptions,
    aggOptionsData,
  } = getPivotDropdownOptions(indexPattern);

  const addGroupBy = (d: DropDownLabel[]) => {
    const label: AggName = d[0].label;
    const config: PivotGroupByConfig = groupByOptionsData[label];
    const aggName: AggName = config.aggName;

    if (isAggNameConflict(aggName, aggList, groupByList)) {
      return;
    }

    groupByList[aggName] = config;
    setGroupByList({ ...groupByList });
  };

  const updateGroupBy = (previousAggName: AggName, item: PivotGroupByConfig) => {
    const groupByListWithoutPrevious = { ...groupByList };
    delete groupByListWithoutPrevious[previousAggName];

    if (isAggNameConflict(item.aggName, aggList, groupByListWithoutPrevious)) {
      return;
    }

    groupByListWithoutPrevious[item.aggName] = item;
    setGroupByList({ ...groupByListWithoutPrevious });
  };

  const deleteGroupBy = (aggName: AggName) => {
    delete groupByList[aggName];
    setGroupByList({ ...groupByList });
  };

  // The list of selected aggregations
  const [aggList, setAggList] = useState(defaults.aggList);

  const addAggregation = (d: DropDownLabel[]) => {
    const label: AggName = d[0].label;
    const config: PivotAggsConfig = aggOptionsData[label];
    const aggName: AggName = config.aggName;

    if (isAggNameConflict(aggName, aggList, groupByList)) {
      return;
    }

    aggList[aggName] = config;
    setAggList({ ...aggList });
  };

  const updateAggregation = (previousAggName: AggName, item: PivotAggsConfig) => {
    const aggListWithoutPrevious = { ...aggList };
    delete aggListWithoutPrevious[previousAggName];

    if (isAggNameConflict(item.aggName, aggListWithoutPrevious, groupByList)) {
      return;
    }

    aggListWithoutPrevious[item.aggName] = item;
    setAggList({ ...aggListWithoutPrevious });
  };

  const deleteAggregation = (aggName: AggName) => {
    delete aggList[aggName];
    setAggList({ ...aggList });
  };

  const pivotAggsArr = dictionaryToArray(aggList);
  const pivotGroupByArr = dictionaryToArray(groupByList);
  const pivotQuery = getPivotQuery(search);

  const valid = pivotGroupByArr.length > 0 && pivotAggsArr.length > 0;
  useEffect(
    () => {
      onChange({ aggList, groupByList, search, valid });
    },
    [
      pivotAggsArr.map(d => `${d.agg} ${d.field} ${d.aggName}`).join(' '),
      pivotGroupByArr
        .map(
          d =>
            `${d.agg} ${d.field} ${isGroupByHistogram(d) ? d.interval : ''} ${
              isGroupByDateHistogram(d) ? d.calendar_interval : ''
            } ${d.aggName}`
        )
        .join(' '),
      search,
      valid,
    ]
  );

  // TODO This should use the actual value of `indices.query.bool.max_clause_count`
  const maxIndexFields = 1024;
  const numIndexFields = indexPattern.fields.length;
  const disabledQuery = numIndexFields > maxIndexFields;

  return (
    <EuiFlexGroup>
      <EuiFlexItem grow={false} style={{ minWidth: '420px' }}>
        <EuiForm>
          {kibanaContext.currentSavedSearch.id === undefined && typeof search === 'string' && (
            <Fragment>
              <EuiFormRow
                label={i18n.translate('xpack.ml.dataframe.definePivotForm.indexPatternLabel', {
                  defaultMessage: 'Index pattern',
                })}
                helpText={
                  disabledQuery
                    ? i18n.translate('xpack.ml.dataframe.definePivotForm.indexPatternHelpText', {
                        defaultMessage:
                          'An optional query for this index pattern is not supported. The number of supported index fields is {maxIndexFields} whereas this index has {numIndexFields} fields.',
                        values: {
                          maxIndexFields,
                          numIndexFields,
                        },
                      })
                    : ''
                }
              >
                <span>{kibanaContext.currentIndexPattern.title}</span>
              </EuiFormRow>
              {!disabledQuery && (
                <EuiFormRow
                  label={i18n.translate('xpack.ml.dataframe.definePivotForm.queryLabel', {
                    defaultMessage: 'Query',
                  })}
                  helpText={i18n.translate('xpack.ml.dataframe.definePivotForm.queryHelpText', {
                    defaultMessage: 'Use a query string to filter the source data (optional).',
                  })}
                >
                  <EuiFieldSearch
                    placeholder={i18n.translate(
                      'xpack.ml.dataframe.definePivotForm.queryPlaceholder',
                      {
                        defaultMessage: 'Search...',
                      }
                    )}
                    onChange={searchHandler}
                    value={search === defaultSearch ? emptySearch : search}
                  />
                </EuiFormRow>
              )}
            </Fragment>
          )}

          {kibanaContext.currentSavedSearch.id !== undefined && (
            <EuiFormRow
              label={i18n.translate('xpack.ml.dataframe.definePivotForm.savedSearchLabel', {
                defaultMessage: 'Saved search',
              })}
            >
              <span>{kibanaContext.currentSavedSearch.title}</span>
            </EuiFormRow>
          )}

          <EuiFormRow
            label={i18n.translate('xpack.ml.dataframe.definePivotForm.groupByLabel', {
              defaultMessage: 'Group by',
            })}
          >
            <Fragment>
              <GroupByListForm
                list={groupByList}
                options={groupByOptionsData}
                onChange={updateGroupBy}
                deleteHandler={deleteGroupBy}
              />
              <DropDown
                changeHandler={addGroupBy}
                options={groupByOptions}
                placeholder={i18n.translate(
                  'xpack.ml.dataframe.definePivotForm.groupByPlaceholder',
                  {
                    defaultMessage: 'Add a group by field ...',
                  }
                )}
              />
            </Fragment>
          </EuiFormRow>

          <EuiFormRow
            label={i18n.translate('xpack.ml.dataframe.definePivotForm.aggregationsLabel', {
              defaultMessage: 'Aggregations',
            })}
          >
            <Fragment>
              <AggListForm
                list={aggList}
                options={aggOptionsData}
                onChange={updateAggregation}
                deleteHandler={deleteAggregation}
              />
              <DropDown
                changeHandler={addAggregation}
                options={aggOptions}
                placeholder={i18n.translate(
                  'xpack.ml.dataframe.definePivotForm.aggregationsPlaceholder',
                  {
                    defaultMessage: 'Add an aggregation ...',
                  }
                )}
              />
            </Fragment>
          </EuiFormRow>
          {!valid && (
            <EuiFormHelpText style={{ maxWidth: '320px' }}>
              {i18n.translate('xpack.ml.dataframe.definePivotForm.formHelp', {
                defaultMessage:
                  'Data frame transforms are scalable and automated processes for pivoting. Choose at least one group-by and aggregation to get started.',
              })}
            </EuiFormHelpText>
          )}
        </EuiForm>
      </EuiFlexItem>

      <EuiFlexItem>
        <SourceIndexPreview cellClick={addToSearch} query={pivotQuery} />
        <EuiSpacer size="l" />
        <PivotPreview aggs={aggList} groupBy={groupByList} query={pivotQuery} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});
