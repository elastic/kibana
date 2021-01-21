/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiFieldSearch,
  EuiFilterButton,
  EuiFilterGroup,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import React, { Dispatch, SetStateAction, useState } from 'react';
import useDebounce from 'react-use/lib/useDebounce';
import { FILTER_REQUESTS_LABEL } from '../../waterfall/components/translations';
import { MimeType } from './types';

interface Props {
  query: string;
  activeFilters: string[];
  setActiveFilters: Dispatch<SetStateAction<string[]>>;
  setQuery: (val: string) => void;
}

const MIME_FILTERS = [
  {
    label: 'XHR',
    mimeType: MimeType.XHR,
  },
  {
    label: 'HTML',
    mimeType: MimeType.Html,
  },
  {
    label: 'JS',
    mimeType: MimeType.Script,
  },
  {
    label: 'CSS',
    mimeType: MimeType.Stylesheet,
  },
  {
    label: 'Font',
    mimeType: MimeType.Font,
  },
  {
    label: 'Media',
    mimeType: MimeType.Media,
  },
];

export const WaterfallFilter = ({ query, setQuery, activeFilters, setActiveFilters }: Props) => {
  const [value, setValue] = useState(query);

  const toggleFilters = (val: string) => {
    setActiveFilters((prevState) => (prevState.includes(val) ? [] : [...prevState, val]));
  };

  useDebounce(
    () => {
      setQuery(value);
    },
    250,
    [value]
  );

  return (
    <EuiFlexGroup gutterSize="s">
      <EuiFlexItem grow={2}>
        <EuiFieldSearch
          fullWidth
          placeholder={FILTER_REQUESTS_LABEL}
          onChange={(evt) => {
            setValue(evt.target.value);
          }}
          value={value}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={3}>
        <EuiFilterGroup>
          {MIME_FILTERS.map(({ label, mimeType }) => (
            <EuiFilterButton
              hasActiveFilters={activeFilters.includes(mimeType)}
              onClick={() => toggleFilters(mimeType)}
              key={label}
              withNext={true}
            >
              {label}
            </EuiFilterButton>
          ))}
        </EuiFilterGroup>
      </EuiFlexItem>
      <EuiFlexItem grow={3} />
    </EuiFlexGroup>
  );
};
