/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiButtonIcon,
  EuiCheckbox,
  EuiFieldSearch,
  EuiFilterButton,
  EuiFilterGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiSpacer,
} from '@elastic/eui';
import React, { Dispatch, SetStateAction, useEffect, useState } from 'react';
import useDebounce from 'react-use/lib/useDebounce';
import {
  FILTER_REQUESTS_LABEL,
  FILTER_SCREENREADER_LABEL,
  FILTER_REMOVE_SCREENREADER_LABEL,
} from '../../waterfall/components/translations';
import { MimeType } from './types';
import { OPEN_FILTERS_POPOVER } from '../../translations';
import { METRIC_TYPE, useUiTracker } from '../../../../../../../observability/public';

interface Props {
  query: string;
  activeFilters: string[];
  setActiveFilters: Dispatch<SetStateAction<string[]>>;
  setQuery: (val: string) => void;
  onlyHighlighted: boolean;
  setOnlyHighlighted: (val: boolean) => void;
}

export const MIME_FILTERS = [
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
  setOnlyHighlighted,
}: Props) => {
  const [value, setValue] = useState(query);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const trackMetric = useUiTracker({ app: 'uptime' });

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

  // indicates use of the query input box
  useEffect(() => {
    if (query) {
      trackMetric({ metric: 'waterfall_filter_input_changed', metricType: METRIC_TYPE.CLICK });
    }
  }, [query, trackMetric]);

  // indicates the collapse to show only highlighted checkbox has been clicked
  useEffect(() => {
    if (onlyHighlighted) {
      trackMetric({
        metric: 'waterfall_filter_collapse_checked',
        metricType: METRIC_TYPE.CLICK,
      });
    }
  }, [onlyHighlighted, trackMetric]);

  // indicates filters have been applied or changed
  useEffect(() => {
    if (activeFilters.length > 0) {
      trackMetric({
        metric: `waterfall_filters_applied_changed`,
        metricType: METRIC_TYPE.CLICK,
      });
    }
  }, [activeFilters, trackMetric]);

  return (
    <EuiFlexGroup gutterSize="xs" alignItems="center">
      <EuiFlexItem>
        <EuiFieldSearch
          fullWidth
          aria-label={FILTER_REQUESTS_LABEL}
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
              aria-label={OPEN_FILTERS_POPOVER}
              iconType="filter"
              onClick={() => setIsPopoverOpen((prevState) => !prevState)}
              color={activeFilters.length > 0 ? 'primary' : 'text'}
              isSelected={activeFilters.length > 0}
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
                aria-label={`${
                  activeFilters.includes(mimeType)
                    ? FILTER_REMOVE_SCREENREADER_LABEL
                    : FILTER_SCREENREADER_LABEL
                } ${label}`}
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
            label="Collapse to only show matching requests"
            checked={onlyHighlighted}
            onChange={(e) => {
              setOnlyHighlighted(e.target.checked);
            }}
          />
        </EuiPopover>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
