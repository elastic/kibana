/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useContext, FC } from 'react';

import { EuiFormRow } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { AggListForm } from '../aggregation_list';
import { DropDown } from '../aggregation_dropdown';
import { GroupByListForm } from '../group_by_list';
import { StepDefineFormContext } from '../step_define';

export const PivotConfiguration: FC = () => {
  const { actions, state } = useContext(StepDefineFormContext);

  return (
    <>
      <EuiFormRow
        label={i18n.translate('xpack.transform.stepDefineForm.groupByLabel', {
          defaultMessage: 'Group by',
        })}
      >
        <>
          <GroupByListForm
            list={state.groupByList}
            options={state.groupByOptionsData}
            onChange={actions.updateGroupBy}
            deleteHandler={actions.deleteGroupBy}
          />
          <DropDown
            changeHandler={actions.addGroupBy}
            options={state.groupByOptions}
            placeholder={i18n.translate('xpack.transform.stepDefineForm.groupByPlaceholder', {
              defaultMessage: 'Add a group by field ...',
            })}
            testSubj="transformGroupBySelection"
          />
        </>
      </EuiFormRow>

      <EuiFormRow
        label={i18n.translate('xpack.transform.stepDefineForm.aggregationsLabel', {
          defaultMessage: 'Aggregations',
        })}
      >
        <>
          <AggListForm
            list={state.aggList}
            options={state.aggOptionsData}
            onChange={actions.updateAggregation}
            deleteHandler={actions.deleteAggregation}
          />
          <DropDown
            changeHandler={actions.addAggregation}
            options={state.aggOptions}
            placeholder={i18n.translate('xpack.transform.stepDefineForm.aggregationsPlaceholder', {
              defaultMessage: 'Add an aggregation ...',
            })}
            testSubj="transformAggregationSelection"
          />
        </>
      </EuiFormRow>
    </>
  );
};
