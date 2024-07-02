/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiFormRow,
  EuiComboBox,
  EuiSpacer,
  EuiRange,
  EuiFieldText,
  EuiSwitch,
  EuiFormLabel,
  EuiLink,
  useEuiTheme,
} from '@elastic/eui';
import { useDebouncedValue } from '@kbn/visualization-utils';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import {
  DEFAULT_DURATION_INPUT_FORMAT,
  DEFAULT_DURATION_OUTPUT_FORMAT,
  FORMATS_UI_SETTINGS,
} from '@kbn/field-formats-plugin/common';
import { css } from '@emotion/react';
import type { DocLinksStart } from '@kbn/core/public';
import { LensAppServices } from '../../../app_plugin/types';
import { GenericIndexPatternColumn } from '../form_based';
import { isColumnFormatted } from '../operations/definitions/helpers';
import { ValueFormatConfig } from '../operations/definitions/column_types';
import { DurationRowInputs } from './formatting/duration_input';
import { Prepend, PrependWidthProvider } from '../../../shared_components/prepend_provider';

const supportedFormats: Record<
  string,
  {
    title: string;
    defaultDecimals?: number;
    supportsCompact: boolean;
    supportsDecimals: boolean;
    supportsSuffix: boolean;
  }
> = {
  number: {
    title: i18n.translate('xpack.lens.indexPattern.numberFormatLabel', {
      defaultMessage: 'Number',
    }),
    supportsDecimals: true,
    supportsSuffix: true,
    supportsCompact: true,
  },
  percent: {
    title: i18n.translate('xpack.lens.indexPattern.percentFormatLabel', {
      defaultMessage: 'Percent',
    }),
    supportsDecimals: true,
    supportsSuffix: true,
    supportsCompact: true,
  },
  bytes: {
    title: i18n.translate('xpack.lens.indexPattern.bytesFormatLabel', {
      defaultMessage: 'Bytes (1024)',
    }),
    supportsDecimals: true,
    supportsSuffix: true,
    supportsCompact: false,
  },
  bits: {
    title: i18n.translate('xpack.lens.indexPattern.bitsFormatLabel', {
      defaultMessage: 'Bits (1000)',
    }),
    defaultDecimals: 0,
    supportsDecimals: true,
    supportsSuffix: true,
    supportsCompact: false,
  },
  duration: {
    title: i18n.translate('xpack.lens.indexPattern.durationLabel', {
      defaultMessage: 'Duration',
    }),
    defaultDecimals: 0,
    supportsDecimals: true,
    supportsSuffix: true,
    supportsCompact: true,
  },
  custom: {
    title: i18n.translate('xpack.lens.indexPattern.customFormatLabel', {
      defaultMessage: 'Custom format',
    }),
    defaultDecimals: 0,
    supportsDecimals: false,
    supportsSuffix: false,
    supportsCompact: false,
  },
};

const defaultOption = {
  value: '',
  label: i18n.translate('xpack.lens.indexPattern.defaultFormatLabel', {
    defaultMessage: 'Default',
  }),
};

const singleSelectionOption = { asPlainText: true };

const label = i18n.translate('xpack.lens.indexPattern.columnFormatLabel', {
  defaultMessage: 'Value format',
});

const decimalsLabel = i18n.translate('xpack.lens.indexPattern.decimalPlacesLabel', {
  defaultMessage: 'Decimals',
});

const suffixLabel = i18n.translate('xpack.lens.indexPattern.suffixLabel', {
  defaultMessage: 'Suffix',
});

const compactLabel = i18n.translate('xpack.lens.indexPattern.compactLabel', {
  defaultMessage: 'Compact values',
});

type FormatParams = NonNullable<ValueFormatConfig['params']>;
type FormatParamsKeys = keyof FormatParams;

interface FormatSelectorProps {
  selectedColumn: GenericIndexPatternColumn;
  onChange: (newFormat?: { id: string; params?: FormatParams }) => void;
  docLinks: DocLinksStart;
}

const RANGE_MIN = 0;
const RANGE_MAX = 15;

function useDebouncedInputforParam<T extends FormatParamsKeys>(
  name: T,
  defaultValue: FormatParams[T],
  currentFormat: ValueFormatConfig | undefined,
  onChange: FormatSelectorProps['onChange']
) {
  const onChangeParam = useCallback(
    (value: FormatParams[T]) => {
      if (!currentFormat) {
        return;
      }
      onChange({
        id: currentFormat.id,
        params: {
          ...currentFormat.params,
          [name]: value,
        } as FormatParams,
      });
    },
    [currentFormat, name, onChange]
  );

  const { handleInputChange: setter, inputValue: value } = useDebouncedValue(
    {
      onChange: onChangeParam,
      value: currentFormat?.params?.[name] || defaultValue,
    },
    { allowFalsyValue: true }
  );
  return { setter, value };
}

export function FormatSelector(props: FormatSelectorProps) {
  const { uiSettings } = useKibana<LensAppServices>().services;
  const { euiTheme } = useEuiTheme();
  const { selectedColumn, onChange, docLinks } = props;
  const currentFormat = isColumnFormatted(selectedColumn)
    ? selectedColumn.params?.format
    : undefined;

  const [decimals, setDecimals] = useState(currentFormat?.params?.decimals ?? 2);

  const { setter: setSuffix, value: suffix } = useDebouncedInputforParam(
    'suffix' as const,
    '',
    currentFormat,
    onChange
  );

  const { setter: setCompact, value: compact } = useDebouncedInputforParam(
    'compact' as const,
    false,
    currentFormat,
    onChange
  );

  const defaultNumeralPatternInKibana = uiSettings.get(
    FORMATS_UI_SETTINGS.FORMAT_NUMBER_DEFAULT_PATTERN
  );
  const { setter: setPattern, value: pattern } = useDebouncedInputforParam(
    'pattern' as const,
    defaultNumeralPatternInKibana,
    currentFormat,
    onChange
  );

  const { setter: setDurationFrom, value: durationFrom } = useDebouncedInputforParam(
    'fromUnit' as const,
    DEFAULT_DURATION_INPUT_FORMAT.kind,
    currentFormat,
    onChange
  );

  const { setter: setDurationTo, value: durationTo } = useDebouncedInputforParam(
    'toUnit' as const,
    DEFAULT_DURATION_OUTPUT_FORMAT.method,
    currentFormat,
    onChange
  );

  const selectedFormat = currentFormat?.id ? supportedFormats[currentFormat.id] : undefined;
  const stableOptions = useMemo(
    () => [
      defaultOption,
      ...Object.entries(supportedFormats).map(([id, format]) => ({
        value: id,
        label: format.title ?? id,
      })),
    ],
    []
  );

  const onChangeWrapped = useCallback(
    (choices) => {
      if (choices.length === 0) {
        return;
      }

      if (!choices[0].value) {
        onChange();
        return;
      }
      const id = choices[0].value;
      const defaultDecimals = supportedFormats[id].defaultDecimals;
      onChange({
        id: choices[0].value,
        params: { decimals: defaultDecimals ?? decimals },
      });
      setDecimals(defaultDecimals ?? decimals);
    },
    [onChange, decimals]
  );

  const currentOption = useMemo(
    () =>
      currentFormat
        ? [
            {
              value: currentFormat.id,
              label: selectedFormat?.title ?? currentFormat.id,
            },
          ]
        : [defaultOption],
    [currentFormat, selectedFormat?.title]
  );

  const approximatedFormat = currentFormat?.id === 'duration' && durationTo === 'humanize';

  return (
    <PrependWidthProvider>
      <>
        <EuiFormRow label={label} display="columnCompressed" fullWidth>
          <div>
            <EuiComboBox
              fullWidth
              compressed
              isClearable={false}
              data-test-subj="indexPattern-dimension-format"
              aria-label={label}
              singleSelection={singleSelectionOption}
              options={stableOptions}
              selectedOptions={currentOption}
              onChange={onChangeWrapped}
            />
            {currentFormat && selectedFormat ? (
              <>
                {currentFormat?.id === 'duration' ? (
                  <>
                    <EuiSpacer size="s" />
                    <DurationRowInputs
                      onStartChange={setDurationFrom}
                      onEndChange={setDurationTo}
                      startValue={durationFrom}
                      endValue={durationTo}
                      testSubjEnd="indexPattern-dimension-duration-end"
                      testSubjStart="indexPattern-dimension-duration-start"
                    />
                  </>
                ) : null}
                {selectedFormat.supportsDecimals && !approximatedFormat ? (
                  <>
                    <EuiSpacer size="s" />
                    <EuiRange
                      showInput="inputWithPopover"
                      value={decimals}
                      min={RANGE_MIN}
                      max={RANGE_MAX}
                      onChange={(e) => {
                        const value = Number(e.currentTarget.value);
                        setDecimals(value);
                        const validatedValue = Math.min(RANGE_MAX, Math.max(RANGE_MIN, value));
                        onChange({
                          id: currentFormat.id,
                          params: {
                            ...currentFormat.params,
                            decimals: validatedValue,
                          },
                        });
                      }}
                      data-test-subj="indexPattern-dimension-formatDecimals"
                      compressed
                      fullWidth
                      prepend={<Prepend>{decimalsLabel}</Prepend>}
                      aria-label={decimalsLabel}
                      disabled={approximatedFormat}
                    />
                  </>
                ) : null}
                {selectedFormat.supportsSuffix ? (
                  <>
                    <EuiSpacer size="s" />
                    <EuiFieldText
                      value={suffix}
                      onChange={(e) => {
                        setSuffix(e.currentTarget.value);
                      }}
                      data-test-subj="indexPattern-dimension-formatSuffix"
                      compressed
                      fullWidth
                      prepend={<Prepend>{suffixLabel}</Prepend>}
                      aria-label={suffixLabel}
                    />
                  </>
                ) : null}
                {selectedFormat.supportsCompact && !approximatedFormat ? (
                  <>
                    <EuiSpacer size="s" />
                    <EuiSwitch
                      compressed
                      label={
                        <EuiFormLabel
                          css={css`
                            font-weight: ${euiTheme.font.weight.regular};
                          `}
                        >
                          {compactLabel}
                        </EuiFormLabel>
                      }
                      checked={Boolean(compact)}
                      onChange={() => setCompact(!compact)}
                      data-test-subj="lns-indexpattern-dimension-formatCompact"
                    />
                  </>
                ) : null}
              </>
            ) : null}
          </div>
        </EuiFormRow>
        {currentFormat?.id === 'custom' ? (
          <EuiFormRow
            display="columnCompressed"
            hasEmptyLabelSpace
            label=" "
            helpText={
              <EuiLink
                href={docLinks.links.indexPatterns.fieldFormattersNumber}
                target="_blank"
                external
              >
                {i18n.translate('xpack.lens.indexPattern.custom.externalDoc', {
                  defaultMessage: 'Numeral formatting syntax',
                })}
              </EuiLink>
            }
          >
            <EuiFieldText
              data-test-subj={'numberEditorFormatPattern'}
              compressed
              prepend={
                <Prepend>
                  {i18n.translate('xpack.lens.indexPattern.custom.patternLabel', {
                    defaultMessage: 'Format',
                  })}
                </Prepend>
              }
              value={pattern}
              placeholder={defaultNumeralPatternInKibana}
              onChange={(e) => {
                setPattern(e.target.value);
              }}
            />
          </EuiFormRow>
        ) : null}
      </>
    </PrependWidthProvider>
  );
}
