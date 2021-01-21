/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiButtonIcon,
  EuiFieldSearch,
  EuiFilterButton,
  EuiFilterGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
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
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const [value, setValue] = useState(query);

  const toggleFilters = (val: string) => {
    setActiveFilters((prevState) => (prevState.includes(val) ? [] : [...prevState, val]));
  };

  useDebounce(
    () => {
      setQuery(value);
    },
    50,
    [value]
  );

  return (
    <EuiFlexGroup gutterSize="xs" alignItems="center">
      <EuiFlexItem>
        <EuiFieldSearch
          placeholder={FILTER_REQUESTS_LABEL}
          onChange={(evt) => {
            setValue(evt.target.value);
          }}
          value={query}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiPopover
          button={
            <EuiButtonIcon
              color={activeFilters.length > 0 ? 'primary' : 'text'}
              onClick={() => setIsPopoverOpen(!isPopoverOpen)}
              iconType={'filter'}
            />
          }
          isOpen={isPopoverOpen}
          closePopover={() => setIsPopoverOpen(false)}
          anchorPosition="rightCenter"
        >
          <EuiFilterGroup>
            {MIME_FILTERS.map(({ label, mimeType }) => (
              <EuiFilterButton
                hasActiveFilters={activeFilters.includes(mimeType)}
                onClick={() => toggleFilters(mimeType)}
                key={label}
              >
                {label}
              </EuiFilterButton>
            ))}
          </EuiFilterGroup>
        </EuiPopover>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
