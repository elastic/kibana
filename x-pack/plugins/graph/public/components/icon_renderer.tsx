/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isColorDark, EuiIcon, EuiIconProps } from '@elastic/eui';
import chroma from 'chroma-js';
import React from 'react';
import type { GenericIcon } from '../helpers/style_choices';
import { MAKI_ICONS } from './maki_icons/assets';

function getIconColor(color?: string) {
  if (color == null) {
    return 'black';
  }
  return isColorDark(...chroma(color).rgb()) ? 'white' : 'black';
}

interface IconRendererProps extends Omit<EuiIconProps, 'type'> {
  icon: GenericIcon | null;
}

export const getIconOffset = (icon: GenericIcon | null) => {
  if (icon == null) {
    return;
  }
  return {
    x: 7.5,
    y: 8.5,
  };
};

export const IconRenderer = ({
  icon,
  color,
  className,
  onClick,
  x,
  y,
  ...otherIconProps
}: IconRendererProps) => {
  if (icon == null) {
    return null;
  }
  const backgroundColor = getIconColor(color);
  if (icon.package === 'maki') {
    return (
      <EuiIcon
        type={MAKI_ICONS[icon.id].Svg}
        aria-label={MAKI_ICONS[icon.id].label}
        color={backgroundColor}
        className={className}
        onClick={onClick}
        x={x}
        y={y}
        {...otherIconProps}
      />
    );
  }
  return (
    <EuiIcon
      type={icon.id}
      color={backgroundColor}
      className={className}
      onClick={onClick}
      x={x}
      y={y}
      {...otherIconProps}
    />
  );
};
