/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Dispatch, SetStateAction, useEffect, useState } from 'react';
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
import useDebounce from 'react-use/lib/useDebounce';
import {
  FILTER_REQUESTS_LABEL,
  FILTER_SCREENREADER_LABEL,
  FILTER_REMOVE_SCREENREADER_LABEL,
  FILTER_POPOVER_OPEN_LABEL,
  FILTER_COLLAPSE_REQUESTS_LABEL,
} from '../../waterfall/components/translations';
import { MimeType, FriendlyMimetypeLabels } from './types';
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
    label: FriendlyMimetypeLabels[MimeType.XHR],
    mimeType: MimeType.XHR,
  },
  {
    label: FriendlyMimetypeLabels[MimeType.Html],
    mimeType: MimeType.Html,
  },
  {
    label: FriendlyMimetypeLabels[MimeType.Script],
    mimeType: MimeType.Script,
  },
  {
    label: FriendlyMimetypeLabels[MimeType.Stylesheet],
    mimeType: MimeType.Stylesheet,
  },
  {
    label: FriendlyMimetypeLabels[MimeType.Font],
    mimeType: MimeType.Font,
  },
  {
    label: FriendlyMimetypeLabels[MimeType.Media],
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

  /* reset checkbox when there is no query or active filters
   * this prevents the checkbox from being checked in a disabled state */
  useEffect(() => {
    if (!(query || activeFilters.length > 0)) {
      setOnlyHighlighted(false);
    }
  }, [activeFilters.length, setOnlyHighlighted, query]);

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
              aria-label={FILTER_POPOVER_OPEN_LABEL}
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
            label={FILTER_COLLAPSE_REQUESTS_LABEL}
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
