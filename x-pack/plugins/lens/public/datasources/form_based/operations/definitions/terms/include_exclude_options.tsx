/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { uniq } from 'lodash';
import { EuiComboBox, EuiFormRow, EuiSpacer, EuiSwitch, EuiFieldText, EuiText } from '@elastic/eui';
import type { DatatableRow } from '@kbn/expressions-plugin/common';
import { useDebouncedValue } from '@kbn/visualization-utils';

export interface IncludeExcludeOptions {
  label: string;
}

const getTermsIncludeExcludeOptions = (
  include?: string[] | number[],
  exclude?: string[] | number[]
) => {
  const includeOptions = include?.map((term) => ({
    label: String(term),
  }));
  const excludeOptions = exclude?.map((term) => ({
    label: String(term),
  }));
  return {
    ...(includeOptions?.length && { include: includeOptions }),
    ...(excludeOptions?.length && { exclude: excludeOptions }),
  };
};

export const IncludeExcludeRow = ({
  include,
  exclude,
  tableRows,
  columnId,
  isNumberField,
  includeIsRegex,
  excludeIsRegex,
  updateParams,
}: {
  include?: string[] | number[];
  exclude?: string[] | number[];
  tableRows?: DatatableRow[];
  columnId: string;
  isNumberField: boolean;
  includeIsRegex: boolean;
  excludeIsRegex: boolean;
  updateParams: (
    operation: string,
    operationValue: Array<string | number>,
    regexParam: string,
    regexValue: boolean
  ) => void;
}) => {
  const [includeExcludeSelectedOptions, setIncludeExcludeSelectedOptions] = useState(
    getTermsIncludeExcludeOptions(include, exclude)
  );
  const [termsOptions, setTermsOptions] = useState<IncludeExcludeOptions[] | undefined>(undefined);
  const [isRegexUsed, setIsRegexUsed] = useState({
    include: includeIsRegex,
    exclude: excludeIsRegex,
  });
  const [regex, setRegex] = useState({
    include: includeIsRegex ? include?.[0] : '',
    exclude: excludeIsRegex ? exclude?.[0] : '',
  });

  useEffect(() => {
    if (isNumberField) {
      setIsRegexUsed({
        include: false,
        exclude: false,
      });
    }
  }, [isNumberField]);

  useEffect(() => {
    if (includeExcludeSelectedOptions?.include?.length) return;

    const uniqueTerms = uniq(tableRows?.map((row) => row[columnId])).filter(
      (row) => row !== '__other__'
    );
    const options = uniqueTerms?.map((row) => {
      return {
        label: String(row),
      };
    });
    setTermsOptions(options);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableRows]);

  const onChangeIncludeExcludeOptions = (
    selectedOptions: IncludeExcludeOptions[],
    operation: 'include' | 'exclude'
  ) => {
    const options = {
      ...includeExcludeSelectedOptions,
      [operation]: selectedOptions,
    };
    setIncludeExcludeSelectedOptions(options);
    const terms = selectedOptions.map((option) => {
      if (!Number.isNaN(Number(option.label))) {
        return Number(option.label);
      }
      return option.label;
    });
    const param = `${operation}IsRegex`;
    updateParams(operation, terms, param, false);
  };

  const onCreateOption = (
    searchValue: string,
    flattenedOptions: IncludeExcludeOptions[] = [],
    operation: 'include' | 'exclude'
  ) => {
    const newOption = {
      label: searchValue,
    };

    let includeExcludeOptions = [];

    const includeORExcludeSelectedOptions = includeExcludeSelectedOptions[operation] ?? [];
    includeExcludeOptions = [...includeORExcludeSelectedOptions, newOption];
    const options = {
      ...includeExcludeSelectedOptions,
      [operation]: includeExcludeOptions,
    };
    setIncludeExcludeSelectedOptions(options);

    const terms = includeExcludeOptions.map((option) => {
      if (!Number.isNaN(Number(option.label))) {
        return Number(option.label);
      }
      return option.label;
    });
    const param = `${operation}IsRegex`;
    updateParams(operation, terms, param, false);
  };

  const onIncludeRegexChangeToDebounce = useCallback(
    (newIncludeValue: string | number | undefined) => {
      setRegex({
        ...regex,
        include: newIncludeValue,
      });
      updateParams('include', [newIncludeValue ?? ''], 'includeIsRegex', true);
    },
    [regex, updateParams]
  );

  const onExcludeRegexChangeToDebounce = useCallback(
    (newExcludeValue: string | number | undefined) => {
      setRegex({
        ...regex,
        exclude: newExcludeValue,
      });
      updateParams('exclude', [newExcludeValue ?? ''], 'excludeIsRegex', true);
    },
    [regex, updateParams]
  );

  const { inputValue: includeRegexValue, handleInputChange: onIncludeRegexValueChange } =
    useDebouncedValue<string | number | undefined>({
      onChange: onIncludeRegexChangeToDebounce,
      value: regex.include,
    });

  const { inputValue: excludeRegexValue, handleInputChange: onExcludeRegexValueChange } =
    useDebouncedValue<string | number | undefined>({
      onChange: onExcludeRegexChangeToDebounce,
      value: regex.exclude,
    });

  return (
    <>
      <EuiSpacer size="m" />
      <EuiFormRow
        label={i18n.translate('xpack.lens.indexPattern.terms.include', {
          defaultMessage: 'Include values',
        })}
        display="rowCompressed"
        fullWidth
        labelAppend={
          !isNumberField ? (
            <EuiSwitch
              label={
                <EuiText size="xs">
                  {i18n.translate('xpack.lens.indexPattern.terms.addRegex', {
                    defaultMessage: 'Use regular expression',
                  })}
                </EuiText>
              }
              data-test-subj="lens-include-terms-regex-switch"
              compressed
              checked={isRegexUsed.include}
              onChange={(e) => {
                const value = e.target.checked;
                setIsRegexUsed({
                  ...isRegexUsed,
                  include: value,
                });
                setRegex({
                  ...regex,
                  include: '',
                });
                setIncludeExcludeSelectedOptions(getTermsIncludeExcludeOptions([], exclude));
                updateParams('include', [], 'includeIsRegex', value);
              }}
            />
          ) : null
        }
      >
        {isRegexUsed.include ? (
          <EuiFieldText
            placeholder={i18n.translate(
              'xpack.lens.indexPattern.terms.includeExcludePatternPlaceholder',
              {
                defaultMessage: 'Enter a regex to filter values',
              }
            )}
            data-test-subj="lens-include-terms-regex-input"
            value={includeRegexValue}
            onChange={(e) => {
              onIncludeRegexValueChange(e.target.value);
            }}
            aria-label={i18n.translate(
              'xpack.lens.indexPattern.terms.includeExcludePatternPlaceholder',
              {
                defaultMessage: 'Enter a regex to filter values',
              }
            )}
          />
        ) : (
          <EuiComboBox
            aria-label={i18n.translate('xpack.lens.indexPattern.terms.include', {
              defaultMessage: 'Include values',
            })}
            placeholder={i18n.translate('xpack.lens.indexPattern.terms.includeExcludePlaceholder', {
              defaultMessage: 'Select values or create a new one',
            })}
            options={termsOptions}
            selectedOptions={includeExcludeSelectedOptions.include}
            onChange={(options) => onChangeIncludeExcludeOptions(options, 'include')}
            onCreateOption={(searchValue, options) =>
              onCreateOption(searchValue, options, 'include')
            }
            isClearable={true}
            data-test-subj="lens-include-terms-combobox"
            autoFocus
          />
        )}
      </EuiFormRow>
      <EuiSpacer size="m" />
      <EuiFormRow
        label={i18n.translate('xpack.lens.indexPattern.terms.exclude', {
          defaultMessage: 'Exclude values',
        })}
        display="rowCompressed"
        fullWidth
        labelAppend={
          !isNumberField ? (
            <EuiSwitch
              label={
                <EuiText size="xs">
                  {i18n.translate('xpack.lens.indexPattern.terms.addRegex', {
                    defaultMessage: 'Use regular expression',
                  })}
                </EuiText>
              }
              compressed
              checked={isRegexUsed.exclude}
              onChange={(e) => {
                const value = e.target.checked;
                setIsRegexUsed({
                  ...isRegexUsed,
                  exclude: value,
                });
                setRegex({
                  ...regex,
                  exclude: '',
                });
                setIncludeExcludeSelectedOptions(getTermsIncludeExcludeOptions(include, []));
                updateParams('exclude', [], 'excludeIsRegex', value);
              }}
            />
          ) : null
        }
      >
        {isRegexUsed.exclude ? (
          <EuiFieldText
            placeholder={i18n.translate(
              'xpack.lens.indexPattern.terms.includeExcludePatternPlaceholder',
              {
                defaultMessage: 'Enter a regex to filter values',
              }
            )}
            value={excludeRegexValue}
            onChange={(e) => {
              onExcludeRegexValueChange(e.target.value);
            }}
            aria-label={i18n.translate(
              'xpack.lens.indexPattern.terms.includeExcludePatternPlaceholder',
              {
                defaultMessage: 'Enter a regex to filter values',
              }
            )}
          />
        ) : (
          <EuiComboBox
            aria-label={i18n.translate('xpack.lens.indexPattern.terms.exclude', {
              defaultMessage: 'Exclude values',
            })}
            placeholder={i18n.translate('xpack.lens.indexPattern.terms.includeExcludePlaceholder', {
              defaultMessage: 'Select values or create a new one',
            })}
            options={termsOptions}
            selectedOptions={includeExcludeSelectedOptions.exclude}
            onChange={(options) => onChangeIncludeExcludeOptions(options, 'exclude')}
            onCreateOption={(searchValue, options) =>
              onCreateOption(searchValue, options, 'exclude')
            }
            isClearable={true}
            data-test-subj="lens-exclude-terms-combobox"
            autoFocus
          />
        )}
      </EuiFormRow>
    </>
  );
};
