/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { darkMode, euiThemeVars } from '@kbn/ui-theme';
import { useMemo } from 'react';

type ResolverColorNames =
  | 'copyableFieldBackground'
  | 'descriptionText'
  | 'full'
  | 'graphControls'
  | 'graphControlsBackground'
  | 'graphControlsBorderColor'
  | 'linkColor'
  | 'resolverBackground'
  | 'resolverEdge'
  | 'resolverEdgeText'
  | 'resolverBreadcrumbBackground'
  | 'pillStroke'
  | 'triggerBackingFill'
  | 'processBackingFill';
type ColorMap = Record<ResolverColorNames, string>;

/**
 * Get access to Kibana-theme based colors.
 */
export function useColors(): ColorMap {
  return useMemo(() => {
    return {
      copyableFieldBackground: euiThemeVars.euiColorLightShade,
      descriptionText: euiThemeVars.euiTextColor,
      full: euiThemeVars.euiColorFullShade,
      graphControls: euiThemeVars.euiColorDarkestShade,
      graphControlsBackground: euiThemeVars.euiColorEmptyShade,
      graphControlsBorderColor: euiThemeVars.euiColorLightShade,
      processBackingFill: `${euiThemeVars.euiColorPrimary}${darkMode ? '1F' : '0F'}`, // Add opacity 0F = 6% , 1F = 12%
      resolverBackground: euiThemeVars.euiColorEmptyShade,
      resolverEdge: darkMode ? euiThemeVars.euiColorLightShade : euiThemeVars.euiColorLightestShade,
      resolverBreadcrumbBackground: euiThemeVars.euiColorLightestShade,
      resolverEdgeText: darkMode ? euiThemeVars.euiColorFullShade : euiThemeVars.euiColorDarkShade,
      triggerBackingFill: `${euiThemeVars.euiColorDanger}${darkMode ? '1F' : '0F'}`,
      pillStroke: euiThemeVars.euiColorLightShade,
      linkColor: euiThemeVars.euiLinkColor,
    };
  }, []);
}
