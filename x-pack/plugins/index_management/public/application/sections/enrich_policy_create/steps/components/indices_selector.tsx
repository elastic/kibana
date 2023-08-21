/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback } from 'react';
import { uniq, debounce } from 'lodash';
import {
  EuiComboBox,
  EuiComboBoxOptionOption
} from '@elastic/eui';
import { getMatchingIndices } from '../../../../services/api';

interface IOption {
  label: string;
  options: Array<{ value: string; label: string; key?: string }>;
}

const getIndexOptions = async (patternString: string) => {
  const options: IOption[] = [];

  if (!patternString) {
    return options;
  }

  const { data } = (await getMatchingIndices(patternString));
  const matchingIndices = data.indices;

  if (matchingIndices.length) {
    const matchingOptions = uniq([...matchingIndices]);

    options.push({
      label: 'Based on your indices',
      options: matchingOptions
        .map((match) => {
          return {
            label: match,
            value: match,
          };
        })
        .sort((a, b) => String(a.label).localeCompare(b.label)),
    });
  }

  return options;
};

export const IndicesSelector = () => {
  const [selectedIndices, setSelectedIndices] = useState<string[]>([]);
  const [indexOptions, setIndexOptions] = useState<IOption[]>([]);
  const [isIndiciesLoading, setIsIndiciesLoading] = useState<boolean>(false);

  const onSearchChange = useCallback(debounce(async (search: string) => {
    setIsIndiciesLoading(true);
    setIndexOptions(await getIndexOptions(search));
    setIsIndiciesLoading(false);
  }, 400), [setIsIndiciesLoading, setIndexOptions]);

  return (
    <>
      <EuiComboBox
        async
        isLoading={isIndiciesLoading}
        noSuggestions={!indexOptions.length}
        options={indexOptions}
        selectedOptions={(selectedIndices || []).map((anIndex: string) => {
          return {
            label: anIndex,
            value: anIndex,
          };
        })}
        onChange={async (selected: EuiComboBoxOptionOption[]) => {
          setSelectedIndices(
            selected.map((aSelected) => aSelected.value) as string[]
          );
        }}
        onSearchChange={onSearchChange}
        onBlur={() => {
          if (selectedIndices.length === 0) {
            setSelectedIndices([]);
          }
        }}
      />
    </>
  );
};
