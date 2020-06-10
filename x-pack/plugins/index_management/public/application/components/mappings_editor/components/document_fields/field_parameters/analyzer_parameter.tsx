/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useState } from 'react';
import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { UseField, TextField, FieldConfig, FieldHook } from '../../../shared_imports';
import { getFieldConfig } from '../../../lib';
import { PARAMETERS_OPTIONS, getSuperSelectOption, INDEX_DEFAULT } from '../../../constants';
import {
  IndexSettings,
  IndexSettingsInterface,
  SelectOption,
  SuperSelectOption,
} from '../../../types';
import { useIndexSettings } from '../../../index_settings_context';
import { AnalyzerParameterSelects } from './analyzer_parameter_selects';

interface Props {
  path: string;
  defaultValue: string | undefined;
  label?: string;
  config?: FieldConfig;
  allowsIndexDefaultOption?: boolean;
  'data-test-subj'?: string;
}

const ANALYZER_OPTIONS = PARAMETERS_OPTIONS.analyzer!;

// token_count requires a value for "analyzer", therefore, we cannot not allow "index_default"
const ANALYZER_OPTIONS_WITHOUT_DEFAULT = (PARAMETERS_OPTIONS.analyzer as SuperSelectOption[]).filter(
  ({ value }) => value !== INDEX_DEFAULT
);

const getCustomAnalyzers = (indexSettings: IndexSettings): SelectOption[] | undefined => {
  const settings: IndexSettingsInterface = {}.hasOwnProperty.call(indexSettings, 'index')
    ? (indexSettings as { index: IndexSettingsInterface }).index
    : (indexSettings as IndexSettingsInterface);

  if (
    !{}.hasOwnProperty.call(settings, 'analysis') ||
    !{}.hasOwnProperty.call(settings.analysis!, 'analyzer')
  ) {
    return undefined;
  }

  // We wrap inside a try catch as the index settings are written in JSON
  // and who knows what the user has entered.
  try {
    return Object.keys(settings.analysis!.analyzer).map((value) => ({ value, text: value }));
  } catch {
    return undefined;
  }
};

export interface MapOptionsToSubOptions {
  [key: string]: {
    label: string;
    options: SuperSelectOption[] | SelectOption[];
  };
}

export const AnalyzerParameter = ({
  path,
  defaultValue,
  label,
  config,
  allowsIndexDefaultOption = true,
  'data-test-subj': dataTestSubj,
}: Props) => {
  const indexSettings = useIndexSettings();
  const customAnalyzers = getCustomAnalyzers(indexSettings);

  const analyzerOptions = allowsIndexDefaultOption
    ? ANALYZER_OPTIONS
    : ANALYZER_OPTIONS_WITHOUT_DEFAULT;

  const fieldOptions = [...analyzerOptions] as SuperSelectOption[];
  const mapOptionsToSubOptions: MapOptionsToSubOptions = {
    language: {
      label: i18n.translate('xpack.idxMgmt.mappingsEditor.analyzers.languageAnalyzerLabel', {
        defaultMessage: 'Language',
      }),
      options: PARAMETERS_OPTIONS.languageAnalyzer!,
    },
  };

  if (customAnalyzers) {
    const customOption: SuperSelectOption = {
      value: 'custom',
      ...getSuperSelectOption(
        i18n.translate('xpack.idxMgmt.mappingsEditor.formSelect.analyzer.customTitle', {
          defaultMessage: 'Custom analyzer',
        }),
        i18n.translate('xpack.idxMgmt.mappingsEditor.formSelect.analyzer.customDescription', {
          defaultMessage: 'Choose one of your custom analyzers.',
        })
      ),
    };
    fieldOptions.push(customOption);

    mapOptionsToSubOptions.custom = {
      label: i18n.translate('xpack.idxMgmt.mappingsEditor.analyzers.customAnalyzerLabel', {
        defaultMessage: 'Custom',
      }),
      options: customAnalyzers,
    };
  }

  const isDefaultValueInOptions =
    defaultValue === undefined || fieldOptions.some((option: any) => option.value === defaultValue);

  let mainValue: string | undefined = defaultValue;
  let subValue: string | undefined;
  let isDefaultValueInSubOptions = false;

  if (!isDefaultValueInOptions && mapOptionsToSubOptions !== undefined) {
    // Check if the default value is one of the subOptions
    for (const [key, subOptions] of Object.entries(mapOptionsToSubOptions)) {
      if (subOptions.options.some((option: any) => option.value === defaultValue)) {
        isDefaultValueInSubOptions = true;
        mainValue = key;
        subValue = defaultValue;
        break;
      }
    }
  }

  const [isCustom, setIsCustom] = useState<boolean>(
    !isDefaultValueInOptions && !isDefaultValueInSubOptions
  );

  const [selectsDefaultValue, setSelectsDefaultValue] = useState({
    main: mainValue,
    sub: subValue,
  });

  const fieldConfig = config ? config : getFieldConfig('analyzer');
  const fieldConfigWithLabel = label !== undefined ? { ...fieldConfig, label } : fieldConfig;

  const toggleCustom = (field: FieldHook) => () => {
    if (isCustom) {
      field.setValue(fieldOptions[0].value);
    } else {
      field.setValue('');
    }

    field.reset({ resetValue: false });
    setSelectsDefaultValue({ main: undefined, sub: undefined });

    setIsCustom(!isCustom);
  };

  return (
    <UseField path={path} config={fieldConfigWithLabel}>
      {(field) => (
        <div className="mappingsEditor__selectWithCustom">
          <EuiButtonEmpty
            size="xs"
            onClick={toggleCustom(field)}
            className="mappingsEditor__selectWithCustom__button"
            data-test-subj={`${dataTestSubj}-toggleCustomButton`}
          >
            {isCustom
              ? i18n.translate('xpack.idxMgmt.mappingsEditor.predefinedButtonLabel', {
                  defaultMessage: 'Use built-in analyzer',
                })
              : i18n.translate('xpack.idxMgmt.mappingsEditor.customButtonLabel', {
                  defaultMessage: 'Use custom analyzer',
                })}
          </EuiButtonEmpty>

          {isCustom ? (
            // Wrap inside a flex item to maintain the same padding
            // around the field.
            <EuiFlexGroup>
              <EuiFlexItem>
                <TextField field={field} data-test-subj={`${dataTestSubj}-custom`} />
              </EuiFlexItem>
            </EuiFlexGroup>
          ) : (
            <AnalyzerParameterSelects
              onChange={field.setValue}
              mainDefaultValue={selectsDefaultValue.main}
              subDefaultValue={selectsDefaultValue.sub}
              config={fieldConfigWithLabel}
              options={fieldOptions}
              mapOptionsToSubOptions={mapOptionsToSubOptions}
              data-test-subj={dataTestSubj}
            />
          )}
        </div>
      )}
    </UseField>
  );
};
