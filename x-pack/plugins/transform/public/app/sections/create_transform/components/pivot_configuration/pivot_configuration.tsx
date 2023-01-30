/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, FC, createContext, useMemo } from 'react';

import { EuiFormRow, type EuiComboBoxOptionOption } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { DropDownOption } from '../../../../common';
import { useAppDependencies } from '../../../../app_dependencies';
import { AggListForm } from '../aggregation_list';
import { DropDown } from '../aggregation_dropdown';
import { GroupByListForm } from '../group_by_list';
import { StepDefineFormHook } from '../step_define';

export const PivotConfigurationContext = createContext<
  StepDefineFormHook['pivotConfig'] | undefined
>(undefined);

export const PivotConfiguration: FC<StepDefineFormHook['pivotConfig']> = memo(
  ({ actions, state }) => {
    const {
      ml: { useFieldStatsTrigger, FieldStatsInfoButton },
    } = useAppDependencies();
    const { handleFieldStatsButtonClick, closeFlyout } = useFieldStatsTrigger();

    const {
      addAggregation,
      addGroupBy,
      deleteAggregation,
      deleteGroupBy,
      updateAggregation,
      updateGroupBy,
    } = actions;

    const { aggList, aggOptions, aggOptionsData, groupByList, groupByOptions, groupByOptionsData } =
      state;

    const options: EuiComboBoxOptionOption[] = useMemo(
      () =>
        aggOptions.map((opt) => {
          const f = { id: opt.label, type: opt.type };
          const aggOption: DropDownOption = {
            isGroupLabelOption: true,
            key: f.id,
            // @ts-ignore Purposefully passing label as element instead of string
            // for more robust rendering
            label: (
              <FieldStatsInfoButton
                field={f}
                label={f.id}
                onButtonClick={handleFieldStatsButtonClick}
              />
            ),
            options: opt.options ?? [],
          };
          return aggOption;
        }),
      [handleFieldStatsButtonClick]
    );
    console.log('aggOptions', aggOptions, options);
    return (
      <PivotConfigurationContext.Provider value={{ actions, state }}>
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
              onChange={(aggName, pivotAggsConfig) => {
                updateAggregation(aggName, pivotAggsConfig);
                closeFlyout();
              }}
              deleteHandler={deleteAggregation}
            />
            <DropDown
              changeHandler={(option) => {
                addAggregation(option);
                closeFlyout();
              }}
              options={options}
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
      </PivotConfigurationContext.Provider>
    );
  }
);
