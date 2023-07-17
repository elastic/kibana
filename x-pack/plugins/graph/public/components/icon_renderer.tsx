/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isColorDark, EuiIcon } from '@elastic/eui';
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

interface IconRendererProps {
  icon: GenericIcon | null;
  color?: string;
  x?: number;
  y?: number;
  className?: string;
}

export const IconRenderer = ({ icon, color, className, ...coords }: IconRendererProps) => {
  if (icon == null) {
    return null;
  }
  const backgroundColor = getIconColor(color);
  if (icon.package === 'maki') {
    return (
      <EuiIcon
        type={MAKI_ICONS[icon.id].Svg}
        title={MAKI_ICONS[icon.id].label}
        color={backgroundColor}
        className={className}
        {...coords}
      />
    );
  }
  return <EuiIcon type={icon.id} color={backgroundColor} {...coords} className={className} />;
};
