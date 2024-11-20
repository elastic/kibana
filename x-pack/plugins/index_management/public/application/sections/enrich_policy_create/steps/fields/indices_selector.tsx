/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback, useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { uniq, isEmpty } from 'lodash';
import { EuiFormRow, EuiComboBox, EuiComboBoxOptionOption } from '@elastic/eui';
import type { EuiComboBoxProps } from '@elastic/eui';
import { getMatchingDataStreams, getMatchingIndices } from '../../../../services/api';
import type { FieldHook } from '../../../../../shared_imports';
import { getFieldValidityAndErrorMessage } from '../../../../../shared_imports';

interface IOption {
  label: string;
  options: Array<{ value: string; label: string; key?: string }>;
}

interface Props {
  field: FieldHook;
  euiFieldProps: EuiComboBoxProps<string>;
  [key: string]: any;
}

interface GetMatchingOptionsParams {
  matches: string[];
  optionsMessage: string;
  noMatchingMessage: string;
}

const i18nTexts = {
  indices: {
    options: i18n.translate('xpack.idxMgmt.enrichPolicyCreate.indicesSelector.optionsLabel', {
      defaultMessage: 'Based on your indices',
    }),
    noMatches: i18n.translate('xpack.idxMgmt.enrichPolicyCreate.indicesSelector.noMatchingOption', {
      defaultMessage: 'No indices match your search criteria.',
    }),
  },
  dataStreams: {
    options: i18n.translate(
      'xpack.idxMgmt.enrichPolicyCreate.indicesSelector.dataStream.optionsLabel',
      {
        defaultMessage: 'Based on your data streams',
      }
    ),
    noMatches: i18n.translate(
      'xpack.idxMgmt.enrichPolicyCreate.indicesSelector.dataStream.noMatchingOption',
      {
        defaultMessage: 'No data stream match your search criteria.',
      }
    ),
  },
  sourcePlaceholder: i18n.translate(
    'xpack.idxMgmt.enrichPolicyCreate.indicesSelector.placeholder',
    {
      defaultMessage: 'Select source indices and/or data streams.',
    }
  ),
};

const getIndexOptions = async (patternString: string) => {
  if (!patternString) {
    return [];
  }

  const { data: indicesData } = await getMatchingIndices(patternString);
  const { data: dataStreamsData } = await getMatchingDataStreams(patternString);

  const indices = getMatchingOptions({
    matches: indicesData.indices,
    optionsMessage: i18nTexts.indices.options,
    noMatchingMessage: i18nTexts.indices.noMatches,
  });
  const dataStreams = getMatchingOptions({
    matches: dataStreamsData.dataStreams,
    optionsMessage: i18nTexts.dataStreams.options,
    noMatchingMessage: i18nTexts.dataStreams.noMatches,
  });

  return [...indices, ...dataStreams];
};

const getMatchingOptions = ({
  matches,
  optionsMessage,
  noMatchingMessage,
}: GetMatchingOptionsParams) => {
  const options: IOption[] = [];
  if (matches.length) {
    const matchingOptions = uniq([...matches]);

    options.push({
      label: optionsMessage,
      options: matchingOptions
        .map((match) => {
          return {
            label: match,
            value: match,
          };
        })
        .sort((a, b) => String(a.label).localeCompare(b.label)),
    });
  } else {
    options.push({
      label: noMatchingMessage,
      options: [],
    });
  }
  return options;
};

export const IndicesSelector = ({ field, euiFieldProps, ...rest }: Props) => {
  const { isInvalid, errorMessage } = getFieldValidityAndErrorMessage(field);
  const [indexOptions, setIndexOptions] = useState<IOption[]>([]);
  const [isIndiciesLoading, setIsIndiciesLoading] = useState<boolean>(false);

  const onSearchChange = useCallback(
    async (search: string) => {
      const indexPattern = isEmpty(search) ? '*' : search;
      setIsIndiciesLoading(true);
      setIndexOptions(await getIndexOptions(indexPattern));
      setIsIndiciesLoading(false);
    },
    [setIsIndiciesLoading, setIndexOptions]
  );

  // Fetch indices on mount so that the ComboBox has some initial options
  useEffect(() => {
    if (isEmpty(field.value)) {
      onSearchChange('*');
    }
  }, [field.value, onSearchChange]);

  return (
    <EuiFormRow
      label={field.label}
      labelAppend={field.labelAppend}
      helpText={field.helpText}
      error={errorMessage}
      isInvalid={isInvalid}
      fullWidth
      {...rest}
    >
      <EuiComboBox
        async
        placeholder={i18nTexts.sourcePlaceholder}
        isLoading={isIndiciesLoading}
        options={indexOptions}
        noSuggestions={!indexOptions.length}
        selectedOptions={((field.value as string[]) || []).map((anIndex: string) => {
          return {
            label: anIndex,
            value: anIndex,
          };
        })}
        onChange={async (selected: EuiComboBoxOptionOption[]) => {
          field.setValue(selected.map((aSelected) => aSelected.value) as string[]);
        }}
        onSearchChange={onSearchChange}
        onBlur={() => {
          if (!field.value) {
            field.setValue([]);
          }
        }}
        data-test-subj="comboBox"
        {...euiFieldProps}
      />
    </EuiFormRow>
  );
};
