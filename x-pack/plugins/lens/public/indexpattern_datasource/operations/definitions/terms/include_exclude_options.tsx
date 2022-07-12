/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { uniq } from 'lodash';
import { EuiComboBox, EuiFormRow, EuiSpacer } from '@elastic/eui';
import type { DatatableRow } from '@kbn/expressions-plugin';

export interface IncludeExcludeOptions {
  label: string;
}

const isRegex = (text: string) => {
  const specialCharacters = /[`@#&*()+\=\[\]{}"\\|.<>\/?~]/;
  return specialCharacters.test(text);
};

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
  updateParams,
}: {
  include?: string[] | number[];
  exclude?: string[] | number[];
  tableRows?: DatatableRow[];
  columnId: string;
  updateParams: (operation: 'include' | 'exclude', value: Array<string | number>) => void;
}) => {
  const [includeExcludeSelectedOptions, setIncludeExcludeSelectedOptions] = useState(
    getTermsIncludeExcludeOptions(include, exclude)
  );
  const [termsOptions, setTermsOptions] = useState<IncludeExcludeOptions[] | undefined>(undefined);
  const [isPatternUsed, setIsPatternUsed] = useState({
    include: false,
    exclude: false,
  });

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
    const patternUsed = {
      ...isPatternUsed,
      [operation]: false,
    };
    setIsPatternUsed(patternUsed);
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
    updateParams(operation, terms);
  };

  const onCreateOption = (
    searchValue: string,
    flattenedOptions: IncludeExcludeOptions[] = [],
    operation: 'include' | 'exclude'
  ) => {
    // check if is regex
    const hasSpecialCharacters = isRegex(searchValue);
    if (hasSpecialCharacters) {
      const patternUsed = {
        ...isPatternUsed,
        [operation]: true,
      };
      setIsPatternUsed(patternUsed);
    }

    const newOption = {
      label: searchValue,
    };

    let includeExcludeOptions = [];

    const includeORExcludeSelectedOptions = hasSpecialCharacters
      ? []
      : includeExcludeSelectedOptions[operation] ?? [];
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

    updateParams(operation, terms);
  };

  return (
    <>
      <EuiSpacer size="m" />
      <EuiFormRow
        label={i18n.translate('xpack.lens.indexPattern.terms.include', {
          defaultMessage: 'Include terms',
        })}
        display="rowCompressed"
        fullWidth
      >
        <EuiComboBox
          aria-label={i18n.translate('xpack.lens.indexPattern.terms.include', {
            defaultMessage: 'Include terms',
          })}
          placeholder={i18n.translate('xpack.lens.indexPattern.terms.includeExcludePlaceholder', {
            defaultMessage: 'Select existing terms or create a new one',
          })}
          options={termsOptions}
          selectedOptions={includeExcludeSelectedOptions.include}
          onChange={(options) => onChangeIncludeExcludeOptions(options, 'include')}
          onCreateOption={(searchValue, options) => onCreateOption(searchValue, options, 'include')}
          isClearable={true}
          data-test-subj="lens-include-terms-combobox"
          autoFocus
          singleSelection={isPatternUsed.include}
        />
      </EuiFormRow>
      <EuiSpacer size="m" />
      <EuiFormRow
        label={i18n.translate('xpack.lens.indexPattern.terms.exclude', {
          defaultMessage: 'Exclude terms',
        })}
        display="rowCompressed"
        fullWidth
      >
        <EuiComboBox
          aria-label={i18n.translate('xpack.lens.indexPattern.terms.exclude', {
            defaultMessage: 'Exclude terms',
          })}
          placeholder={i18n.translate('xpack.lens.indexPattern.terms.includeExcludePlaceholder', {
            defaultMessage: 'Select existing terms or create a new one',
          })}
          options={termsOptions}
          selectedOptions={includeExcludeSelectedOptions.exclude}
          onChange={(options) => onChangeIncludeExcludeOptions(options, 'exclude')}
          onCreateOption={(searchValue, options) => onCreateOption(searchValue, options, 'exclude')}
          isClearable={true}
          data-test-subj="lens-exclude-terms-combobox"
          autoFocus
          singleSelection={isPatternUsed.exclude}
        />
      </EuiFormRow>
    </>
  );
};
