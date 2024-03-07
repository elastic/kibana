/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, type FC } from 'react';

import { EuiComboBox, EuiToolTip, type EuiComboBoxOptionOption } from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { useAppDependencies } from '../../../../app_dependencies';
import { DropDownOption } from '../../../../common';
import { MAX_NESTING_SUB_AGGS } from '../../../../common/pivot_aggs';

import { useWizardActions, useWizardSelector } from '../../state_management/create_transform_store';

import { type DropDownOptionWithField } from '../step_define/common/get_pivot_dropdown_options';
import { usePivotConfigOptions } from '../step_define/hooks/use_pivot_config';

const placeholderAggregation = i18n.translate(
  'xpack.transform.stepDefineForm.aggregationsPlaceholder',
  {
    defaultMessage: 'Add an aggregation ...',
  }
);

const placeholderSubAggregation = i18n.translate(
  'xpack.transform.stepDefineForm.addSubAggregationPlaceholder',
  {
    defaultMessage: 'Add a sub-aggregation ...',
  }
);

interface AggListDropDownProps {
  parentAggId?: string;
}

export const AggListDropDown: FC<AggListDropDownProps> = ({ parentAggId }) => {
  const {
    ml: { useFieldStatsTrigger, FieldStatsInfoButton },
  } = useAppDependencies();
  const { handleFieldStatsButtonClick, closeFlyout, renderOption, populatedFields } =
    useFieldStatsTrigger();

  const aggList = useWizardSelector((s) => s.stepDefine.aggList);

  const { pivotConfig: actions } = useWizardActions();
  const { addAggregation, addSubAggregation } = actions;

  const addAggregationHandler = useCallback(
    (d: EuiComboBoxOptionOption[]) => {
      if (parentAggId) {
        addSubAggregation(d, parentAggId);
      } else {
        addAggregation(d);
      }
      closeFlyout();
    },
    [addAggregation, addSubAggregation, closeFlyout, parentAggId]
  );

  const { aggOptions } = usePivotConfigOptions();

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

  const isNewSubAggAllowed: boolean = useMemo(() => {
    if (!parentAggId) return true;

    const parentAgg = aggList[parentAggId];
    const nestingLevel = parentAgg.nestingLevel ?? 0;
    return nestingLevel <= MAX_NESTING_SUB_AGGS;
  }, [aggList, parentAggId]);

  const dropdown = (
    <EuiComboBox
      fullWidth
      placeholder={parentAggId ? placeholderSubAggregation : placeholderAggregation}
      singleSelection={{ asPlainText: true }}
      options={aggOptionsWithFieldStats}
      selectedOptions={[]}
      onChange={addAggregationHandler}
      isClearable={false}
      data-test-subj={
        parentAggId ? 'transformSubAggregationSelection' : 'transformAggregationSelection'
      }
      renderOption={renderOption}
      isDisabled={!isNewSubAggAllowed}
    />
  );

  return (
    <>
      {isNewSubAggAllowed ? (
        dropdown
      ) : (
        <EuiToolTip
          anchorClassName="eui-displayBlock"
          content={
            <FormattedMessage
              id="xpack.transform.stepDefineForm.maxSubAggsLevelsLimitMessage"
              defaultMessage="You have reached the maximum number of levels of sub-aggregations that can be added in the form. Please edit the JSON config if you want to add another level."
            />
          }
        >
          {dropdown}
        </EuiToolTip>
      )}
    </>
  );
};
