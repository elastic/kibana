/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { uniq } from 'lodash';

import { i18n } from '@kbn/i18n';

import React, { ChangeEvent, Fragment, SFC, useContext, useEffect, useState } from 'react';

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
  DropDownLabel,
  getPivotQuery,
  groupByConfigHasInterval,
  IndexPatternContext,
  Label,
  PivotAggsConfig,
  PivotGroupByConfig,
  PivotGroupByConfigDict,
} from '../../common';

import { getPivotDropdownOptions } from './common';

export interface DefinePivotExposedState {
  aggList: Label[];
  aggs: PivotAggsConfig[];
  groupByList: PivotGroupByConfigDict;
  search: string;
  valid: boolean;
}

const defaultSearch = '*';
const emptySearch = '';

export function getDefaultPivotState(): DefinePivotExposedState {
  return {
    aggList: [] as Label[],
    aggs: [] as PivotAggsConfig[],
    groupByList: {} as PivotGroupByConfigDict,
    search: defaultSearch,
    valid: false,
  };
}

interface Props {
  overrides?: DefinePivotExposedState;
  onChange(s: DefinePivotExposedState): void;
}

export const DefinePivotForm: SFC<Props> = React.memo(({ overrides = {}, onChange }) => {
  const defaults = { ...getDefaultPivotState(), ...overrides };

  const indexPattern = useContext(IndexPatternContext);

  if (indexPattern === null) {
    return null;
  }

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

  const addGroupByInterval = (label: Label, item: PivotGroupByConfig) => {
    groupByList[label] = item;
    setGroupByList({ ...groupByList });
  };

  const addGroupBy = (d: DropDownLabel[]) => {
    const label: Label = d[0].label;
    groupByList[label] = groupByOptionsData[label];
    setGroupByList({ ...groupByList });
  };

  const deleteGroupBy = (label: Label) => {
    delete groupByList[label];
    setGroupByList({ ...groupByList });
  };

  // The list of selected aggregations
  const [aggList, setAggList] = useState(defaults.aggList as Label[]);

  const addAggregation = (d: DropDownLabel[]) => {
    const label: Label = d[0].label;
    const newList = uniq([...aggList, label]);
    setAggList(newList);
  };

  const deleteAggregation = (label: Label) => {
    const newList = aggList.filter(l => l !== label);
    setAggList(newList);
  };

  const pivotAggs = aggList.map(l => aggOptionsData[l]);
  const pivotGroupByArr = dictionaryToArray(groupByList);
  const pivotQuery = getPivotQuery(search);

  const valid = pivotGroupByArr.length > 0 && aggList.length > 0;
  useEffect(
    () => {
      onChange({ aggList, aggs: pivotAggs, groupByList, search, valid });
    },
    [
      aggList,
      pivotAggs.map(d => `${d.agg} ${d.field} ${d.formRowLabel}`).join(' '),
      pivotGroupByArr
        .map(
          d =>
            `${d.agg} ${d.field} ${groupByConfigHasInterval(d) ? d.interval : ''} ${d.formRowLabel}`
        )
        .join(' '),
      search,
      valid,
    ]
  );

  const displaySearch = search === defaultSearch ? emptySearch : search;

  return (
    <EuiFlexGroup>
      <EuiFlexItem grow={false} style={{ minWidth: '420px' }}>
        <EuiForm>
          <EuiFormRow
            label={i18n.translate('xpack.ml.dataframe.definePivotForm.queryLabel', {
              defaultMessage: 'Query',
            })}
          >
            <EuiFieldSearch
              placeholder={i18n.translate('xpack.ml.dataframe.definePivotForm.queryPlaceholder', {
                defaultMessage: 'Search...',
              })}
              onChange={searchHandler}
              value={displaySearch}
            />
          </EuiFormRow>

          <EuiFormRow
            label={i18n.translate('xpack.ml.dataframe.definePivotForm.groupByLabel', {
              defaultMessage: 'Group by',
            })}
          >
            <Fragment>
              <GroupByListForm
                list={groupByList}
                onChange={addGroupByInterval}
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
                optionsData={aggOptionsData}
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
        <PivotPreview aggs={pivotAggs} groupBy={groupByList} query={pivotQuery} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});
