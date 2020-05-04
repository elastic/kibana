/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isEqual } from 'lodash';
import React, { memo, FC } from 'react';

import { EuiFormRow } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { AggListForm } from '../aggregation_list';
import { DropDown } from '../aggregation_dropdown';
import { GroupByListForm } from '../group_by_list';
import { StepDefineFormHook } from '../step_define';

export const PivotConfiguration: FC<StepDefineFormHook['pivotConfig']> = memo(
  ({
    actions: {
      addAggregation,
      addGroupBy,
      deleteAggregation,
      deleteGroupBy,
      updateAggregation,
      updateGroupBy,
    },
    state: { aggList, aggOptions, aggOptionsData, groupByList, groupByOptions, groupByOptionsData },
  }) => {
    return (
      <>
        <EuiFormRow
          fullWidth
          label={i18n.translate('xpack.transform.stepDefineForm.groupByLabel', {
            defaultMessage: 'Group by',
          })}
        >
          <>
            <GroupByListForm
              list={groupByList}
              options={groupByOptionsData}
              onChange={updateGroupBy}
              deleteHandler={deleteGroupBy}
            />
            <DropDown
              changeHandler={addGroupBy}
              options={groupByOptions}
              placeholder={i18n.translate('xpack.transform.stepDefineForm.groupByPlaceholder', {
                defaultMessage: 'Add a group by field ...',
              })}
              testSubj="transformGroupBySelection"
            />
          </>
        </EuiFormRow>

        <EuiFormRow
          fullWidth
          label={i18n.translate('xpack.transform.stepDefineForm.aggregationsLabel', {
            defaultMessage: 'Aggregations',
          })}
        >
          <>
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
                'xpack.transform.stepDefineForm.aggregationsPlaceholder',
                {
                  defaultMessage: 'Add an aggregation ...',
                }
              )}
              testSubj="transformAggregationSelection"
            />
          </>
        </EuiFormRow>
      </>
    );
  },
  (prevProps, nextProps) => {
    return isEqual(prevProps.state, nextProps.state);
  }
);
