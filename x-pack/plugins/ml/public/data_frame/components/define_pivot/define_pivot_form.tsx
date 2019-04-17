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
import { GroupByList } from '../../components/group_by_list/list';
import { SourceIndexPreview } from '../../components/source_index_preview';
import { PivotPreview } from './pivot_preview';

import { Dictionary } from '../../../../common/types/common';
import {
  DropDownLabel,
  DropDownOption,
  getPivotQuery,
  Label,
  OptionsDataElement,
  pivotSupportedAggs,
  PIVOT_SUPPORTED_AGGS,
} from '../../common';

import { IndexPatternContext } from '../../common';

enum FIELD_TYPE {
  IP = 'ip',
  NUMBER = 'number',
  STRING = 'string',
}

export interface DefinePivotExposedState {
  aggList: Label[];
  aggs: OptionsDataElement[];
  groupBy: Label[];
  search: string;
  valid: boolean;
}

const defaultSearch = '*';
const emptySearch = '';

export function getDefaultPivotState() {
  return {
    aggList: [] as Label[],
    groupBy: [] as Label[],
    search: defaultSearch,
    valid: false,
  } as DefinePivotExposedState;
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
  const [groupBy, setGroupBy] = useState(defaults.groupBy as Label[]);

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
    pivotSupportedAggs.forEach(agg => {
      if (
        (agg === PIVOT_SUPPORTED_AGGS.CARDINALITY &&
          (field.type === FIELD_TYPE.STRING || field.type === FIELD_TYPE.IP)) ||
        (agg !== PIVOT_SUPPORTED_AGGS.CARDINALITY && field.type === FIELD_TYPE.NUMBER)
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
  const pivotQuery = getPivotQuery(search);

  const valid = pivotGroupBy.length > 0 && aggList.length > 0;

  useEffect(
    () => {
      onChange({ aggList, aggs: pivotAggs, groupBy: pivotGroupBy, search, valid });
    },
    [
      aggList,
      pivotAggs.map(d => `${d.agg} ${d.field} ${d.formRowLabel}`).join(' '),
      pivotGroupBy,
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
              <GroupByList list={pivotGroupBy} deleteHandler={deleteGroupBy} />
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
                  'Data frame fransforms are scalable and automated processes for pivoting. Choose at least one group-by and aggregation to get started.',
              })}
            </EuiFormHelpText>
          )}
        </EuiForm>
      </EuiFlexItem>

      <EuiFlexItem>
        <SourceIndexPreview cellClick={addToSearch} query={pivotQuery} />
        <EuiSpacer size="l" />
        <PivotPreview aggs={pivotAggs} groupBy={pivotGroupBy} query={pivotQuery.query} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});
