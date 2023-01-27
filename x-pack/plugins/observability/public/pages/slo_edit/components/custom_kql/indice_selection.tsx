/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiComboBox, EuiComboBoxOptionOption } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useEffect, useState } from 'react';
import { useFetchIndices, Index } from '../../../../hooks/use_fetch_indices';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface Props {}

interface Option {
  label: string;
  options: Array<{ value: string; label: string }>;
}

export function IndiceSelection(props: Props) {
  const { loading, indices = [] } = useFetchIndices();
  const [selectedOptions, setSelectedOptions] = useState<EuiComboBoxOptionOption[]>([]);
  const [indexOptions, setIndexOptions] = useState<Option[]>([]);

  useEffect(() => {
    setIndexOptions([createIndexOptions(indices)]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [indices.length]);

  const onChange = (selected: EuiComboBoxOptionOption[]) => {
    setSelectedOptions(selected);
  };

  const onSearchChange = (search: string) => {
    const options: Option[] = [];
    if (!search) {
      return setIndexOptions([createIndexOptions(indices)]);
    }

    const searchPattern = search.endsWith('*') ? search.substring(0, search.length - 1) : search;
    const matchingIndices = indices.filter(({ name }) => name.includes(searchPattern));

    if (matchingIndices.length === 0) {
      return setIndexOptions([]);
    }

    options.push(createIndexOptions(matchingIndices));

    const searchWithStarSuffix = search.endsWith('*') ? search : `${search}*`;
    options.push({
      label: i18n.translate(
        'xpack.observability.slos.sloEdit.customKql.indexSelection.indexPatternLabel',
        { defaultMessage: 'Use an index pattern' }
      ),
      options: [{ value: searchWithStarSuffix, label: searchWithStarSuffix }],
    });

    setIndexOptions(options);
  };

  return (
    <EuiComboBox
      aria-label={i18n.translate(
        'xpack.observability.slos.sloEdit.customKql.indexSelection.placeholder',
        {
          defaultMessage: 'Select an index or index pattern',
        }
      )}
      async
      data-test-subj="indexSelection"
      isClearable={true}
      isLoading={loading}
      onChange={onChange}
      onSearchChange={onSearchChange}
      options={indexOptions}
      placeholder={i18n.translate(
        'xpack.observability.slos.sloEdit.customKql.indexSelection.placeholder',
        {
          defaultMessage: 'Select an index or index pattern',
        }
      )}
      selectedOptions={selectedOptions}
      singleSelection
    />
  );
}

function createIndexOptions(indices: Index[]): Option {
  return {
    label: i18n.translate(
      'xpack.observability.slos.sloEdit.customKql.indexSelection.indicesLabel',
      { defaultMessage: 'Select an existing index' }
    ),
    options: indices
      .map(({ name }) => ({ label: name, value: name }))
      .sort((a, b) => String(a.label).localeCompare(b.label)),
  };
}
