/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';

import { i18n } from '@kbn/i18n';

import {
  EuiButton,
  EuiCodeBlock,
  EuiComboBox,
  EuiFieldText,
  EuiForm,
  EuiFormRow,
  EuiSelect,
  EuiSelectOption,
} from '@elastic/eui';

import { cloneDeep } from 'lodash';
import useUpdateEffect from 'react-use/lib/useUpdateEffect';
import { AggName } from '../../../../../../common/types/aggregations';
import { dictionaryToArray } from '../../../../../../common/types/common';
import { PivotSupportedAggs } from '../../../../../../common/types/pivot_aggs';

import {
  isAggName,
  isPivotAggsConfigWithUiBase,
  getEsAggFromAggConfig,
  PivotAggsConfig,
  PivotAggsConfigWithUiSupportDict,
} from '../../../../common';
import { isPivotAggsWithExtendedForm } from '../../../../common/pivot_aggs';
import { getAggFormConfig } from '../step_define/common/get_agg_form_config';

interface Props {
  defaultData: PivotAggsConfig;
  otherAggNames: AggName[];
  options: PivotAggsConfigWithUiSupportDict;
  onChange(d: PivotAggsConfig): void;
}

export const PopoverForm: React.FC<Props> = ({ defaultData, otherAggNames, onChange, options }) => {
  const [aggConfigDef, setAggConfigDef] = useState(cloneDeep(defaultData));

  const [aggName, setAggName] = useState(defaultData.aggName);
  const [agg, setAgg] = useState(defaultData.agg);
  const [field, setField] = useState<string | string[] | null>(
    isPivotAggsConfigWithUiBase(defaultData) ? defaultData.field : ''
  );

  const isUnsupportedAgg = !isPivotAggsConfigWithUiBase(defaultData);

  // Update configuration based on the aggregation type
  useEffect(() => {
    if (agg === aggConfigDef.agg) return;
    const config = getAggFormConfig(agg, {
      parentAgg: aggConfigDef.parentAgg,
      subAggs: aggConfigDef.subAggs,
      agg,
      aggName,
      dropDownName: aggName,
      field,
    });
    setAggConfigDef(config);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agg, aggConfigDef]);

  useUpdateEffect(() => {
    if (isPivotAggsWithExtendedForm(aggConfigDef)) {
      const name = aggConfigDef.getAggName ? aggConfigDef.getAggName() : undefined;
      if (name !== undefined) {
        setAggName(name);
      }
    }
  }, [aggConfigDef]);

  const availableFields: EuiSelectOption[] = [];
  const availableAggs: EuiSelectOption[] = [];

  function updateAgg(aggVal: PivotSupportedAggs) {
    setAgg(aggVal);
  }

  function getUpdatedItem(): PivotAggsConfig {
    let resultField = field;
    if (
      isPivotAggsConfigWithUiBase(aggConfigDef) &&
      !aggConfigDef.isMultiField &&
      Array.isArray(field)
    ) {
      // reset to a single field in case agg doesn't support multiple fields
      resultField = field[0];
    }

    const updatedItem = {
      ...aggConfigDef,
      agg,
      aggName,
      dropDownName: defaultData.dropDownName,
      ...(isUnsupportedAgg ? {} : { field: resultField }),
    };

    return updatedItem;
  }

  if (!isUnsupportedAgg) {
    const optionsArr = dictionaryToArray(options);

    optionsArr
      .filter((o) => o.agg === defaultData.agg)
      .forEach((o) => {
        availableFields.push({ text: o.field });
      });

    optionsArr
      .filter(
        (o) =>
          isPivotAggsConfigWithUiBase(defaultData) &&
          (Array.isArray(defaultData.field)
            ? defaultData.field.includes(o.field as string)
            : o.field === defaultData.field)
      )
      .forEach((o) => {
        availableAggs.push({ text: o.agg });
      });
  }

  let aggNameError = '';

  let validAggName = isAggName(aggName);
  if (!validAggName) {
    aggNameError = i18n.translate('xpack.transform.agg.popoverForm.aggNameInvalidCharError', {
      defaultMessage:
        'Invalid name. The characters "[", "]", and ">" are not allowed and the name must not start or end with a space character.',
    });
  }

  if (validAggName) {
    validAggName = !otherAggNames.includes(aggName);
    aggNameError = i18n.translate('xpack.transform.agg.popoverForm.aggNameAlreadyUsedError', {
      defaultMessage: 'Another aggregation already uses that name.',
    });
  }

  let formValid = validAggName;

  if (isPivotAggsWithExtendedForm(aggConfigDef)) {
    formValid = validAggName && aggConfigDef.isValid();
  }

  return (
    <EuiForm css={{ width: '300px' }} data-test-subj={'transformAggPopoverForm_' + aggName}>
      <EuiFormRow
        error={!validAggName && [aggNameError]}
        isInvalid={!validAggName}
        helpText={
          isUnsupportedAgg
            ? i18n.translate('xpack.transform.agg.popoverForm.unsupportedAggregationHelpText', {
                defaultMessage:
                  'Only the aggregation name can be edited in this form. Please use the advanced editor to edit the other parts of the aggregation.',
              })
            : ''
        }
        label={i18n.translate('xpack.transform.agg.popoverForm.nameLabel', {
          defaultMessage: 'Aggregation name',
        })}
      >
        <EuiFieldText
          value={aggName}
          isInvalid={!validAggName}
          onChange={(e) => setAggName(e.target.value)}
          data-test-subj="transformAggName"
        />
      </EuiFormRow>
      {availableFields.length > 0 ? (
        aggConfigDef.isMultiField ? (
          <EuiFormRow
            label={i18n.translate('xpack.transform.agg.popoverForm.fieldsLabel', {
              defaultMessage: 'Fields',
            })}
          >
            <EuiComboBox
              fullWidth
              options={availableFields.map((v) => {
                return {
                  value: v.text,
                  label: v.text as string,
                };
              })}
              selectedOptions={
                !!field
                  ? (typeof field === 'string' ? [field] : field).map((v) => ({
                      value: v,
                      label: v,
                    }))
                  : []
              }
              onChange={(e) => {
                const res = e.map((v) => v.value as string);
                setField(res);
              }}
              isClearable={false}
              data-test-subj="transformAggFields"
            />
          </EuiFormRow>
        ) : (
          <EuiFormRow
            label={i18n.translate('xpack.transform.agg.popoverForm.fieldLabel', {
              defaultMessage: 'Field',
            })}
          >
            <EuiSelect
              options={availableFields}
              value={field as string}
              onChange={(e) => setField(e.target.value)}
              data-test-subj="transformAggField"
            />
          </EuiFormRow>
        )
      ) : null}
      {availableAggs.length > 0 && (
        <EuiFormRow
          label={i18n.translate('xpack.transform.agg.popoverForm.aggLabel', {
            defaultMessage: 'Aggregation',
          })}
        >
          <EuiSelect
            options={availableAggs}
            value={agg}
            onChange={(e) => updateAgg(e.target.value as PivotSupportedAggs)}
            data-test-subj="transformAggType"
          />
        </EuiFormRow>
      )}
      {isPivotAggsWithExtendedForm(aggConfigDef) ? (
        <aggConfigDef.AggFormComponent
          aggConfig={aggConfigDef.aggConfig}
          selectedField={field as string}
          onChange={(update: typeof aggConfigDef.aggConfig) => {
            setAggConfigDef({
              ...aggConfigDef,
              aggConfig: update,
            });
          }}
          isValid={aggConfigDef.isValid()}
        />
      ) : null}
      {isUnsupportedAgg && (
        <EuiCodeBlock
          aria-label={i18n.translate('xpack.transform.agg.popoverForm.codeBlock', {
            defaultMessage: 'JSON of transform aggregation',
          })}
          fontSize="s"
          language="json"
          paddingSize="s"
          css={{ width: '100%', height: '200px' }}
        >
          {JSON.stringify(getEsAggFromAggConfig(defaultData), null, 2)}
        </EuiCodeBlock>
      )}
      <EuiFormRow hasEmptyLabelSpace>
        <EuiButton
          isDisabled={!formValid}
          onClick={() => onChange(getUpdatedItem())}
          data-test-subj="transformApplyAggChanges"
        >
          {i18n.translate('xpack.transform.agg.popoverForm.submitButtonLabel', {
            defaultMessage: 'Apply',
          })}
        </EuiButton>
      </EuiFormRow>
    </EuiForm>
  );
};
