/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC, useMemo } from 'react';

import { EuiFormRow, type EuiComboBoxOptionOption } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import {
  getPivotDropdownOptions,
  type DropDownOptionWithField,
} from '../step_define/common/get_pivot_dropdown_options';
import { DropDownOption } from '../../../../common';
import { useAppDependencies } from '../../../../app_dependencies';
import { AggListForm } from '../aggregation_list';
import { DropDown } from '../aggregation_dropdown';
import { GroupByListForm } from '../group_by_list';
import { useWizardActions, useWizardSelector } from '../../state_management/create_transform_store';
import { useWizardContext } from '../wizard/wizard';

export const PivotConfiguration: FC = () => {
  const {
    ml: { useFieldStatsTrigger, FieldStatsInfoButton },
  } = useAppDependencies();
  const { handleFieldStatsButtonClick, closeFlyout, renderOption, populatedFields } =
    useFieldStatsTrigger();
  const { searchItems } = useWizardContext();
  const { dataView } = searchItems;

  const { pivotConfig: actions } = useWizardActions();
  const {
    addAggregation,
    addGroupBy,
    deleteAggregation,
    deleteGroupBy,
    updateAggregation,
    updateGroupBy,
  } = actions;

  const aggList = useWizardSelector((s) => s.stepDefine.aggList);
  const groupByList = useWizardSelector((s) => s.stepDefine.groupByList);
  const runtimeMappings = useWizardSelector((s) => s.stepDefine.runtimeMappings);

  const { aggOptions, aggOptionsData, groupByOptions, groupByOptionsData } = useMemo(
    () => getPivotDropdownOptions(dataView, runtimeMappings),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [runtimeMappings]
  );

  const aggOptionsWithFieldStats: EuiComboBoxOptionOption[] = useMemo(
    () =>
      aggOptions.map(({ label, field, options }: DropDownOptionWithField) => {
        const aggOption: DropDownOption = {
          isGroupLabelOption: true,
          key: field.id,
          // @ts-ignore Purposefully passing label as element instead of string
          // for more robust rendering
          label: (
            <FieldStatsInfoButton
              isEmpty={populatedFields && !populatedFields.has(field.id)}
              field={field}
              label={label}
              onButtonClick={handleFieldStatsButtonClick}
            />
          ),
          options: options ?? [],
        };
        return aggOption;
      }),
    [aggOptions, FieldStatsInfoButton, handleFieldStatsButtonClick, populatedFields]
  );

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
            renderOption={renderOption}
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
            options={aggOptionsWithFieldStats}
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
