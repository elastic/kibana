/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiIcon, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { euiStyled } from '@kbn/kibana-react-plugin/common';
import React, { MouseEventHandler, useCallback, useState } from 'react';

export function WaterfallLegendItem<T = string>({
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
      <EuiIcon color={color} size="m" type={isBoxFilled ? 'stopFilled' : 'stopSlash'} />

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

const CLICK_FILTER_LABEL = i18n.translate('xpack.synthetics.waterfall.applyFilters.message', {
  defaultMessage: 'Click to add or remove filter',
});
