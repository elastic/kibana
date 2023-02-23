/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Dispatch, SetStateAction, useState, useCallback, MouseEventHandler } from 'react';
import { i18n } from '@kbn/i18n';
import { euiStyled } from '@kbn/kibana-react-plugin/common';
import { EuiIcon, EuiText, EuiFlexGroup, EuiButtonEmpty, useEuiTheme } from '@elastic/eui';

import {
  FriendlyTimingLabels,
  MIME_FILTERS,
  MimeType,
  Timings,
} from '../../../common/network_data/types';
import { colourPalette } from '../../../common/network_data/data_formatting';

interface Props {
  activeFilters: string[];
  setActiveFilters: Dispatch<SetStateAction<string[]>>;
}

export const WaterfallLegend = ({ activeFilters, setActiveFilters }: Props) => {
  const { euiTheme } = useEuiTheme();

  const addOrRemoveFilter = useCallback(
    (filter: MimeType) => {
      setActiveFilters((filters) => {
        const updated = filters.includes(filter)
          ? filters.filter((f) => f !== filter)
          : [...filters, filter];
        return updated.length === MIME_FILTERS.length ? [] : updated;
      });
    },
    [setActiveFilters]
  );

  const clearFilters = useCallback(() => {
    setActiveFilters([]);
  }, [setActiveFilters]);

  const anyFilterApplied = activeFilters.length > 0;

  return (
    <>
      <EuiFlexGroup direction="column" gutterSize="none">
        <EuiFlexGroup direction="row" alignItems="baseline">
          <EuiText size="xs">
            <h3>{LEGEND_LABEL}</h3>
          </EuiText>
          {!anyFilterApplied ? (
            <EuiText size="xs" color="subdued">
              {APPLY_FILTER_LABEL}
            </EuiText>
          ) : null}

          {anyFilterApplied ? (
            <EuiButtonEmpty size="xs" onClick={clearFilters}>
              {CLEAR_FILTER_LABEL}
            </EuiButtonEmpty>
          ) : null}
        </EuiFlexGroup>
        <EuiFlexGroup>
          <EuiFlexGroup wrap={true} css={{ gap: `min(3%, ${euiTheme.size.l})` }}>
            {MIME_FILTERS.map((f) => (
              <LegendItem
                key={f.mimeType}
                id={f.mimeType}
                color={colourPalette[f.mimeType]}
                label={f.label}
                isClickable={true}
                isActive={!activeFilters.length || activeFilters.includes(f.mimeType)}
                onClick={addOrRemoveFilter}
              />
            ))}
          </EuiFlexGroup>
        </EuiFlexGroup>
      </EuiFlexGroup>

      <EuiFlexGroup wrap={true} css={{ gap: `min(3%, ${euiTheme.size.l})` }}>
        {Object.values(Timings)
          .filter((t) => t !== Timings.Receive)
          .map((t) => (
            <LegendItem key={t} id={t} color={colourPalette[t]} label={FriendlyTimingLabels[t]} />
          ))}
      </EuiFlexGroup>
    </>
  );
};

const LEGEND_LABEL = i18n.translate('xpack.synthetics.waterfall.chartLegend.heading', {
  defaultMessage: 'Legend',
});

function LegendItem<T = string>({
  id,
  color,
  label,
  boxSize = 12,
  isClickable = false,
  isActive = false,
  onClick,
}: {
  id: T;
  color: string;
  label: string;
  boxSize?: number;
  isActive?: boolean;
  isClickable?: boolean;
  onClick?: (id: T) => void;
}) {
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const onMouseEvent: MouseEventHandler<HTMLDivElement> = useCallback((evt) => {
    setIsHovered(evt?.type === 'mouseenter');
  }, []);

  const isBoxFilled = !isClickable || isActive || isHovered;
  const title = isClickable ? CLICK_FILTER_LABEL : undefined;
  const ariaLabel = `${label}${isClickable ? ` - ${title}` : ''}`;

  return (
    <EuiFlexGroupLegendItem
      role={isClickable ? 'checkbox' : 'listitem'}
      title={title}
      aria-label={ariaLabel}
      aria-checked={isClickable ? isActive : undefined}
      css={{ height: 16, cursor: isClickable ? 'pointer' : undefined }}
      alignItems="center"
      gutterSize="s"
      onMouseEnter={onMouseEvent}
      onMouseLeave={onMouseEvent}
      onClick={() => {
        onClick?.(id);
      }}
    >
      <EuiIcon
        style={{ backgroundColor: isBoxFilled ? color : undefined }}
        color={color}
        size="s"
        type="eyeClosed"
      />

      <EuiText size="xs">{label}</EuiText>
    </EuiFlexGroupLegendItem>
  );
}

const EuiFlexGroupLegendItem = euiStyled(EuiFlexGroup)`
  flex-grow: 0;
  flex-shrink: 0;
  &:active {
    ${({ role }) => (role === 'checkbox' ? 'text-decoration: underline;' : '')}
  }
`;

const APPLY_FILTER_LABEL = i18n.translate('xpack.synthetics.waterfall.applyFilters.label', {
  defaultMessage: 'Select an item to apply filter',
});

const CLICK_FILTER_LABEL = i18n.translate('xpack.synthetics.waterfall.applyFilters.message', {
  defaultMessage: 'Click to add or remove filter',
});

const CLEAR_FILTER_LABEL = i18n.translate('xpack.synthetics.waterfall.clearFilters.label', {
  defaultMessage: 'Clear filters',
});
