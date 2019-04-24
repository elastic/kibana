/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { SFC, useContext } from 'react';

import { i18n } from '@kbn/i18n';

import {
  EuiComboBoxOptionProps,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiText,
} from '@elastic/eui';

import { AggListSummary } from '../../components/aggregation_list';
import { GroupByList } from '../../components/group_by_list/list';
import { PivotPreview } from './pivot_preview';

import { Dictionary } from '../../../../common/types/common';
import {
  DropDownLabel,
  DropDownOption,
  IndexPatternContext,
  Label,
  OptionsDataElement,
  PIVOT_SUPPORTED_AGGS,
  pivotSupportedAggs,
  SimpleQuery,
} from '../../common';
import { FIELD_TYPE } from './common';

const defaultSearch = '*';
const emptySearch = '';

interface Props {
  search: string;
  groupBy: Label[];
  aggList: Label[];
}

export const DefinePivotSummary: SFC<Props> = ({ search, groupBy, aggList }) => {
  const indexPattern = useContext(IndexPatternContext);

  if (indexPattern === null) {
    return null;
  }

  const fields = indexPattern.fields
    .filter(field => field.aggregatable === true)
    .map(field => ({ name: field.name, type: field.type }));

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

  const pivotQuery: SimpleQuery = {
    query_string: {
      query: search,
      default_operator: 'AND',
    },
  };

  const displaySearch = search === defaultSearch ? emptySearch : search;

  return (
    <EuiFlexGroup>
      <EuiFlexItem grow={false} style={{ minWidth: '420px' }}>
        <EuiForm>
          <EuiFormRow
            label={i18n.translate('xpack.ml.dataframe.definePivotSummary.queryLabel', {
              defaultMessage: 'Query',
            })}
          >
            <span>{displaySearch}</span>
          </EuiFormRow>

          <EuiFormRow
            label={i18n.translate('xpack.ml.dataframe.definePivotSummary.groupByLabel', {
              defaultMessage: 'Group by',
            })}
          >
            <GroupByList list={pivotGroupBy} />
          </EuiFormRow>

          <EuiFormRow
            label={i18n.translate('xpack.ml.dataframe.definePivotSummary.aggregationsLabel', {
              defaultMessage: 'Aggregations',
            })}
          >
            <AggListSummary list={aggList} optionsData={aggOptionsData} />
          </EuiFormRow>
        </EuiForm>
      </EuiFlexItem>

      <EuiFlexItem>
        <EuiText>
          <PivotPreview aggs={pivotAggs} groupBy={pivotGroupBy} query={pivotQuery} />
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
