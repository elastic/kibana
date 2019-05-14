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
import { GroupByListSummary } from '../../components/group_by_list';
import { PivotPreview } from './pivot_preview';

import {
  DropDownOption,
  getPivotQuery,
  isKibanaContext,
  KibanaContext,
  PivotAggsConfigDict,
  PIVOT_SUPPORTED_AGGS,
  pivotSupportedAggs,
} from '../../common';
import { FIELD_TYPE } from './common';
import { DefinePivotExposedState } from './define_pivot_form';

const defaultSearch = '*';
const emptySearch = '';

export const DefinePivotSummary: SFC<DefinePivotExposedState> = ({
  search,
  groupByList,
  aggList,
}) => {
  const kibanaContext = useContext(KibanaContext);

  if (!isKibanaContext(kibanaContext)) {
    return null;
  }

  const indexPattern = kibanaContext.currentIndexPattern;

  const fields = indexPattern.fields
    .filter(field => field.aggregatable === true)
    .map(field => ({ name: field.name, type: field.type }));

  // The available aggregations
  const aggOptions: EuiComboBoxOptionProps[] = [];
  const aggOptionsData: PivotAggsConfigDict = {};

  fields.forEach(field => {
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
        const aggName = `${agg}_${field.name}`;
        aggOptionsData[label] = { agg, field: field.name, aggName };
      }
    });
    aggOptions.push(aggOption);
  });

  const pivotQuery = getPivotQuery(search);

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
            <GroupByListSummary list={groupByList} />
          </EuiFormRow>

          <EuiFormRow
            label={i18n.translate('xpack.ml.dataframe.definePivotSummary.aggregationsLabel', {
              defaultMessage: 'Aggregations',
            })}
          >
            <AggListSummary list={aggList} />
          </EuiFormRow>
        </EuiForm>
      </EuiFlexItem>

      <EuiFlexItem>
        <EuiText>
          <PivotPreview aggs={aggList} groupBy={groupByList} query={pivotQuery} />
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
