/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { uniq } from 'lodash';

import React, { ChangeEvent, Fragment, SFC, useState } from 'react';

import { StaticIndexPattern } from 'ui/index_patterns';

import {
  EuiComboBoxOptionProps,
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiText,
} from '@elastic/eui';

import { DropDown } from '../../components/aggregation_dropdown/dropdown';
import { AggList } from '../../components/aggregation_list/list';
import { GroupByList } from '../../components/group_by_list/list';
import { DataFrameNewPivotPreview } from './data_frame_new_pivot_preview';
import { DataFrameSourceIndexPreview } from './data_frame_new_pivot_source_index_preview';

import { Dictionary } from '../../../../common/types/common';
import {
  DropDownLabel,
  DropDownOption,
  Label,
  OptionsDataElement,
  SimpleQuery,
} from './type_definitions';

const aggs = ['avg', 'cardinality', 'max', 'min', 'sum', 'value_count'];

interface Props {
  indexPattern: StaticIndexPattern;
}

export const DataFrameNewPivotWizardCreatePivot: SFC<Props> = ({ indexPattern }) => {
  const fields = indexPattern.fields
    .filter(field => field.aggregatable === true)
    .map(field => ({ name: field.name, type: field.type }));

  // The search filter
  const [search, setSearch] = useState('*');

  const addToSearch = (newSearch: string) => {
    const currentDisplaySearch = search === '*' ? '' : search;
    setSearch(`${currentDisplaySearch} ${newSearch}`.trim());
  };

  const searchHandler = (d: ChangeEvent<HTMLInputElement>) => {
    const newSearch = d.currentTarget.value === '' ? '*' : d.currentTarget.value;
    setSearch(newSearch);
  };

  // The list of selected group by fields
  const [groupBy, setGroupBy] = useState([] as Label[]);

  const addGroupBy = (d: DropDownLabel[]) => {
    const label: Label = d[0].label;
    const newList = uniq([...groupBy, label]);
    setGroupBy(newList);
  };

  const deleteGroupBy = (label: Label) => {
    const newList = groupBy.filter(l => l !== label);
    setGroupBy(newList);
  };

  // The list of selected aggregations
  const [aggList, setAggList] = useState([] as Label[]);

  const addAggregation = (d: DropDownLabel[]) => {
    const label: Label = d[0].label;
    const newList = uniq([...aggList, label]);
    setAggList(newList);
  };

  const deleteAggregation = (label: Label) => {
    const newList = aggList.filter(l => l !== label);
    setAggList(newList);
  };

  // The available fields for group by
  const groupByOptions: EuiComboBoxOptionProps[] = [];
  fields.forEach(field => {
    const o: DropDownLabel = { label: field.name };
    groupByOptions.push(o);
  });

  // The available aggregations
  const aggOptions: EuiComboBoxOptionProps[] = [];
  const aggOptionsData: Dictionary<OptionsDataElement> = {};

  fields.forEach(field => {
    const o: DropDownOption = { label: field.name, options: [] };
    aggs.forEach(agg => {
      if (
        (agg === 'cardinality' && (field.type === 'string' || field.type === 'ip')) ||
        (agg !== 'cardinality' && field.type === 'number')
      ) {
        const label = `${agg}(${field.name})`;
        o.options.push({ label });
        const formRowLabel = `${agg}_${field.name}`;
        aggOptionsData[label] = { agg, field: field.name, formRowLabel };
      }
    });
    aggOptions.push(o);
  });

  const pivotAggs = aggList.map(l => aggOptionsData[l]);
  const pivotGroupBy = groupBy;

  const pivotQuery: SimpleQuery = {
    query: {
      query_string: {
        query: search,
        default_operator: 'AND',
      },
    },
  };

  const displaySearch = search === '*' ? '' : search;

  return (
    <EuiFlexGroup>
      <EuiFlexItem grow={false} style={{ minWidth: '420px' }}>
        <EuiForm>
          <EuiFormRow label="Query">
            <EuiFieldSearch
              placeholder="Search..."
              onChange={searchHandler}
              value={displaySearch}
            />
          </EuiFormRow>

          <EuiFormRow label="Group by">
            <Fragment>
              <GroupByList list={pivotGroupBy} deleteHandler={deleteGroupBy} />
              <DropDown
                changeHandler={addGroupBy}
                options={groupByOptions}
                placeholder="Add a group by field ..."
              />
            </Fragment>
          </EuiFormRow>

          <EuiFormRow label="Aggregations">
            <Fragment>
              <AggList
                list={aggList}
                optionsData={aggOptionsData}
                deleteHandler={deleteAggregation}
              />
              <DropDown
                changeHandler={addAggregation}
                options={aggOptions}
                placeholder="Add an aggregation ..."
              />
            </Fragment>
          </EuiFormRow>
        </EuiForm>
      </EuiFlexItem>

      <EuiFlexItem>
        <EuiText>
          <DataFrameSourceIndexPreview
            cellClick={addToSearch}
            indexPattern={indexPattern}
            query={pivotQuery}
          />

          <DataFrameNewPivotPreview
            aggs={pivotAggs}
            groupBy={pivotGroupBy}
            indexPattern={indexPattern}
            query={pivotQuery.query}
          />
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
