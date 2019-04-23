/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { uniq } from 'lodash';

import { i18n } from '@kbn/i18n';

import React, { ChangeEvent, Fragment, SFC, useContext, useEffect, useState } from 'react';

import {
  EuiComboBoxOptionProps,
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormHelpText,
  EuiFormRow,
  EuiSpacer,
} from '@elastic/eui';

import { DropDown } from '../../components/aggregation_dropdown/dropdown';
import { AggListForm } from '../../components/aggregation_list';
import { GroupByListForm } from '../../components/group_by_list';
import { SourceIndexPreview } from '../../components/source_index_preview';
import { PivotPreview } from './pivot_preview';

import {
  DropDownLabel,
  DropDownOption,
  getPivotQuery,
  IndexPatternContext,
  Label,
  PivotAggsConfig,
  PivotAggsConfigDict,
  PivotGroupByConfig,
  PivotGroupByConfigDict,
  pivotSupportedAggs,
  PIVOT_SUPPORTED_AGGS,
  PIVOT_SUPPORTED_GROUP_BY_AGGS,
} from '../../common';

import { FIELD_TYPE } from './common';

export interface DefinePivotExposedState {
  aggList: Label[];
  aggs: PivotAggsConfig[];
  groupByList: Label[];
  groupBy: PivotGroupByConfig[];
  search: string;
  valid: boolean;
}

const defaultSearch = '*';
const emptySearch = '';

export function getDefaultPivotState(): DefinePivotExposedState {
  return {
    aggList: [] as Label[],
    aggs: [] as PivotAggsConfig[],
    groupByList: [] as Label[],
    groupBy: [] as PivotGroupByConfig[],
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

  const fields = indexPattern.fields
    .filter(field => field.aggregatable === true)
    .map(field => ({ name: field.name, type: field.type }));

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
  const [groupByList, setGroupByList] = useState(defaults.groupByList as Label[]);
  const defaultGroupByInterval: PivotGroupByConfigDict = {};
  defaults.groupBy.forEach(gb => {
    const label = `${gb.agg}(${gb.field})`;
    defaultGroupByInterval[label] = gb;
  });
  const [groupByInterval, setGroupByInterval] = useState(defaultGroupByInterval);

  const addGroupByInterval = (label: Label, item: PivotGroupByConfig) => {
    groupByInterval[label] = item;
    setGroupByInterval({ ...groupByInterval });
  };

  const addGroupBy = (d: DropDownLabel[]) => {
    const label: Label = d[0].label;
    const newList = uniq([...groupByList, label]);
    setGroupByList(newList);
  };

  const deleteGroupBy = (label: Label) => {
    const newList = groupByList.filter(l => l !== label);
    setGroupByList(newList);
    delete groupByInterval[label];
    setGroupByInterval(groupByInterval);
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

  // The available group by options
  const groupByOptions: EuiComboBoxOptionProps[] = [];
  const groupByOptionsData: PivotGroupByConfigDict = {};

  // The available aggregations
  const aggOptions: EuiComboBoxOptionProps[] = [];
  const aggOptionsData: PivotAggsConfigDict = {};

  fields.forEach(field => {
    // group by
    if (field.type === FIELD_TYPE.STRING) {
      const label = `${PIVOT_SUPPORTED_GROUP_BY_AGGS.TERMS}(${field.name})`;
      const groupByOption: DropDownLabel = { label };
      groupByOptions.push(groupByOption);
      const formRowLabel = `${PIVOT_SUPPORTED_GROUP_BY_AGGS.TERMS}_${field.name}`;
      groupByOptionsData[label] = {
        agg: PIVOT_SUPPORTED_GROUP_BY_AGGS.TERMS,
        field: field.name,
        formRowLabel,
      };
    } else if (field.type === FIELD_TYPE.NUMBER) {
      const label = `${PIVOT_SUPPORTED_GROUP_BY_AGGS.HISTOGRAM}(${field.name})`;
      const groupByOption: DropDownLabel = { label };
      groupByOptions.push(groupByOption);
      const formRowLabel = `${PIVOT_SUPPORTED_GROUP_BY_AGGS.HISTOGRAM}_${field.name}`;
      groupByOptionsData[label] = {
        agg: PIVOT_SUPPORTED_GROUP_BY_AGGS.HISTOGRAM,
        field: field.name,
        formRowLabel,
        interval: '10',
      };
    } else if (field.type === FIELD_TYPE.DATE) {
      const label = `${PIVOT_SUPPORTED_GROUP_BY_AGGS.DATE_HISTOGRAM}(${field.name})`;
      const groupByOption: DropDownLabel = { label };
      groupByOptions.push(groupByOption);
      const formRowLabel = `${PIVOT_SUPPORTED_GROUP_BY_AGGS.DATE_HISTOGRAM}_${field.name}`;
      groupByOptionsData[label] = {
        agg: PIVOT_SUPPORTED_GROUP_BY_AGGS.DATE_HISTOGRAM,
        field: field.name,
        formRowLabel,
        interval: '1m',
      };
    }

    // aggregations
    const aggOption: DropDownOption = { label: field.name, options: [] };
    pivotSupportedAggs.forEach(agg => {
      if (
        (agg === PIVOT_SUPPORTED_AGGS.CARDINALITY &&
          (field.type === FIELD_TYPE.STRING || field.type === FIELD_TYPE.IP)) ||
        (agg !== PIVOT_SUPPORTED_AGGS.CARDINALITY && field.type === FIELD_TYPE.NUMBER)
      ) {
        const label = `${agg}(${field.name})`;
        aggOption.options.push({ label });
        const formRowLabel = `${agg}_${field.name}`;
        aggOptionsData[label] = { agg, field: field.name, formRowLabel };
      }
    });
    aggOptions.push(aggOption);
  });

  const pivotAggs = aggList.map(l => aggOptionsData[l]);
  const pivotGroupBy = groupByList.map(l => groupByInterval[l] || groupByOptionsData[l]);
  const pivotQuery = getPivotQuery(search);

  const valid = pivotGroupBy.length > 0 && aggList.length > 0;
  useEffect(
    () => {
      onChange({ aggList, aggs: pivotAggs, groupByList, groupBy: pivotGroupBy, search, valid });
    },
    [
      aggList,
      pivotAggs.map(d => `${d.agg} ${d.field} ${d.formRowLabel}`).join(' '),
      groupByList,
      pivotGroupBy
        .map(d => `${d.agg} ${d.field} ${'interval' in d ? d.interval : ''} ${d.formRowLabel}`)
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
                intervalData={groupByInterval}
                list={groupByList}
                onChange={addGroupByInterval}
                optionsData={groupByOptionsData}
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
        <PivotPreview aggs={pivotAggs} groupBy={pivotGroupBy} query={pivotQuery} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});
