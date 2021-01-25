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
  EuiCheckbox,
  EuiPopover,
  EuiButtonIcon,
  EuiSpacer,
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
  onlyHighlighted: boolean;
  setOlyHighlighted: (val: boolean) => void;
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

export const WaterfallFilter = ({
  query,
  setQuery,
  activeFilters,
  setActiveFilters,
  onlyHighlighted,
  setOlyHighlighted,
}: Props) => {
  const [value, setValue] = useState(query);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const toggleFilters = (val: string) => {
    setActiveFilters((prevState) =>
      prevState.includes(val) ? prevState.filter((filter) => filter !== val) : [...prevState, val]
    );
  };

  useDebounce(
    () => {
      setQuery(value);
    },
    250,
    [value]
  );

  return (
    <EuiFlexGroup gutterSize="xs" alignItems="center">
      <EuiFlexItem>
        <EuiFieldSearch
          fullWidth
          data-test-subj="waterfallFilterInput"
          placeholder={FILTER_REQUESTS_LABEL}
          onChange={(evt) => {
            setValue(evt.target.value);
          }}
          value={value}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiPopover
          button={
            <EuiButtonIcon
              iconType="filter"
              onClick={() => setIsPopoverOpen((prevState) => !prevState)}
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
                withNext={true}
              >
                {label}
              </EuiFilterButton>
            ))}
          </EuiFilterGroup>
          <EuiSpacer size="xs" />
          <EuiCheckbox
            compressed={true}
            disabled={!(query || activeFilters.length > 0)}
            id="onlyHighlighted"
            label="Only show highlighted"
            checked={onlyHighlighted}
            onChange={(e) => {
              setOlyHighlighted(e.target.checked);
            }}
          />
        </EuiPopover>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
