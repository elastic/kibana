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

import { KBN_FIELD_TYPES } from '../../../../common/constants/field_types';

import { AggListSummary } from '../../components/aggregation_list';
import { GroupByListSummary } from '../../components/group_by_list';
import { PivotPreview } from './pivot_preview';

import {
  DropDownOption,
  getPivotQuery,
  isKibanaContext,
  KibanaContext,
  PivotAggsConfigDict,
  pivotAggsFieldSupport,
} from '../../common';
import { Field } from './common';
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

  const ignoreFieldNames = ['_id', '_index', '_type'];
  const fields = indexPattern.fields
    .filter(field => field.aggregatable === true && !ignoreFieldNames.includes(field.name))
    .map((field): Field => ({ name: field.name, type: field.type as KBN_FIELD_TYPES }));

  // The available aggregations
  const aggOptions: EuiComboBoxOptionProps[] = [];
  const aggOptionsData: PivotAggsConfigDict = {};

  fields.forEach(field => {
    // Aggregations
    const aggOption: DropDownOption = { label: field.name, options: [] };
    const availableAggs = pivotAggsFieldSupport[field.type];
    availableAggs.forEach(agg => {
      const aggName = `${agg}(${field.name})`;
      aggOption.options.push({ label: aggName });
      aggOptionsData[aggName] = { agg, field: field.name, aggName };
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
