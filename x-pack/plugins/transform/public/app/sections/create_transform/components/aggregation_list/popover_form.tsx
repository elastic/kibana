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
  EuiFieldNumber,
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
import {
  PivotSupportedAggs,
  PIVOT_SUPPORTED_AGGS,
} from '../../../../../../common/types/pivot_aggs';

import {
  isAggName,
  isPivotAggsConfigPercentiles,
  isPivotAggsConfigTerms,
  isPivotAggsConfigWithUiSupport,
  getEsAggFromAggConfig,
  PERCENTILES_AGG_DEFAULT_PERCENTS,
  TERMS_AGG_DEFAULT_SIZE,
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

function getDefaultPercents(defaultData: PivotAggsConfig): number[] | undefined {
  if (isPivotAggsConfigPercentiles(defaultData)) {
    return defaultData.percents;
  }
}

function parsePercentsInput(inputValue: string | undefined) {
  if (inputValue !== undefined) {
    const strVals: string[] = inputValue.split(',');
    const percents: number[] = [];
    for (const str of strVals) {
      if (str.trim().length > 0 && isNaN(str as any) === false) {
        const val = Number(str);
        if (val >= 0 && val <= 100) {
          percents.push(val);
        } else {
          return [];
        }
      }
    }

    return percents;
  }

  return [];
}

// Input string should only include comma separated numbers
function isValidPercentsInput(inputValue: string) {
  return /^[0-9]+(,[0-9]+)*$/.test(inputValue);
}

function getDefaultSize(defaultData: PivotAggsConfig): number | undefined {
  if (isPivotAggsConfigTerms(defaultData)) {
    return defaultData.size;
  }
}

function parseSizeInput(inputValue: string | undefined) {
  if (inputValue !== undefined && isValidSizeInput(inputValue)) {
    return parseInt(inputValue, 10);
  }

  return TERMS_AGG_DEFAULT_SIZE;
}

// Input string should only include numbers
function isValidSizeInput(inputValue: string) {
  return /^\d+$/.test(inputValue);
}

export const PopoverForm: React.FC<Props> = ({ defaultData, otherAggNames, onChange, options }) => {
  const [aggConfigDef, setAggConfigDef] = useState(cloneDeep(defaultData));

  const [aggName, setAggName] = useState(defaultData.aggName);
  const [agg, setAgg] = useState(defaultData.agg);
  const [field, setField] = useState<string | string[]>(
    isPivotAggsConfigWithUiSupport(defaultData) ? defaultData.field : ''
  );

  const [percents, setPercents] = useState(getDefaultPercents(defaultData));
  const [validPercents, setValidPercents] = useState(agg === PIVOT_SUPPORTED_AGGS.PERCENTILES);
  const [size, setSize] = useState(getDefaultSize(defaultData));
  const [validSize, setValidSize] = useState(agg === PIVOT_SUPPORTED_AGGS.TERMS);

  const isUnsupportedAgg = !isPivotAggsConfigWithUiSupport(defaultData);

  // Update configuration based on the aggregation type
  useEffect(() => {
    if (agg === aggConfigDef.agg) return;
    const config = getAggFormConfig(agg, {
      agg,
      aggName,
      dropDownName: aggName,
      field,
    });
    setAggConfigDef(config);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agg]);

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
    if (aggVal === PIVOT_SUPPORTED_AGGS.PERCENTILES && percents === undefined) {
      setPercents(PERCENTILES_AGG_DEFAULT_PERCENTS);
    }
    if (aggVal === PIVOT_SUPPORTED_AGGS.TERMS && size === undefined) {
      setSize(TERMS_AGG_DEFAULT_SIZE);
    }
  }

  function updatePercents(inputValue: string) {
    setPercents(parsePercentsInput(inputValue));
    setValidPercents(isValidPercentsInput(inputValue));
  }

  function updateSize(inputValue: string) {
    setSize(parseSizeInput(inputValue));
    setValidSize(isValidSizeInput(inputValue));
  }

  function getUpdatedItem(): PivotAggsConfig {
    let updatedItem: PivotAggsConfig;

    let resultField = field;
    if (
      isPivotAggsConfigWithUiSupport(aggConfigDef) &&
      !aggConfigDef.isMultiField &&
      Array.isArray(field)
    ) {
      // reset to a single field in case agg doesn't support multiple fields
      resultField = field[0];
    }

    if (agg === PIVOT_SUPPORTED_AGGS.PERCENTILES) {
      updatedItem = {
        agg,
        aggName,
        field: resultField,
        dropDownName: defaultData.dropDownName,
        percents,
      };
    } else if (agg === PIVOT_SUPPORTED_AGGS.TERMS) {
      updatedItem = {
        agg,
        aggName,
        field: resultField,
        dropDownName: defaultData.dropDownName,
        size,
      };
    } else {
      updatedItem = {
        ...aggConfigDef,
        agg,
        aggName,
        field: resultField,
        dropDownName: defaultData.dropDownName,
      };
    }

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
          isPivotAggsConfigWithUiSupport(defaultData) &&
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

  let percentsText;
  if (percents !== undefined) {
    percentsText = percents.toString();
  }

  let sizeText;
  if (size !== undefined) {
    sizeText = size.toString();
  }

  let formValid = validAggName;
  if (formValid && agg === PIVOT_SUPPORTED_AGGS.PERCENTILES) {
    formValid = validPercents;
  }
  if (formValid && agg === PIVOT_SUPPORTED_AGGS.TERMS) {
    formValid = validSize;
  }
  if (isPivotAggsWithExtendedForm(aggConfigDef)) {
    formValid = validAggName && aggConfigDef.isValid();
  }

  return (
    <EuiForm style={{ width: '300px' }} data-test-subj={'transformAggPopoverForm_' + aggName}>
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
              selectedOptions={(typeof field === 'string' ? [field] : field).map((v) => ({
                value: v,
                label: v,
              }))}
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
      {isPivotAggsWithExtendedForm(aggConfigDef) && (
        <aggConfigDef.AggFormComponent
          aggConfig={aggConfigDef.aggConfig}
          selectedField={field as string}
          onChange={(update: typeof aggConfigDef.aggConfig) => {
            setAggConfigDef({
              ...aggConfigDef,
              aggConfig: update,
            });
          }}
        />
      )}
      {agg === PIVOT_SUPPORTED_AGGS.PERCENTILES && (
        <EuiFormRow
          label={i18n.translate('xpack.transform.agg.popoverForm.percentsLabel', {
            defaultMessage: 'Percents',
          })}
          error={
            !validPercents && [
              i18n.translate('xpack.transform.groupBy.popoverForm.intervalPercents', {
                defaultMessage: 'Enter a comma-separated list of percentiles',
              }),
            ]
          }
          isInvalid={!validPercents}
        >
          <EuiFieldText
            defaultValue={percentsText}
            onChange={(e) => updatePercents(e.target.value)}
          />
        </EuiFormRow>
      )}
      {agg === PIVOT_SUPPORTED_AGGS.TERMS && (
        <EuiFormRow
          label={i18n.translate('xpack.transform.agg.popoverForm.sizeLabel', {
            defaultMessage: 'Size',
          })}
          error={
            !validSize && [
              i18n.translate('xpack.transform.groupBy.popoverForm.invalidSizeErrorMessage', {
                defaultMessage: 'Enter a valid positive number',
              }),
            ]
          }
          isInvalid={!validSize}
        >
          <EuiFieldNumber defaultValue={sizeText} onChange={(e) => updateSize(e.target.value)} />
        </EuiFormRow>
      )}
      {isUnsupportedAgg && (
        <EuiCodeBlock
          aria-label={i18n.translate('xpack.transform.agg.popoverForm.codeBlock', {
            defaultMessage: 'JSON of transform aggregation',
          })}
          fontSize="s"
          language="json"
          paddingSize="s"
          style={{ width: '100%', height: '200px' }}
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
