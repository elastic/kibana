/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import euiThemeAmsterdamDark from '@elastic/eui/dist/eui_theme_amsterdam_dark.json';
import euiThemeAmsterdamLight from '@elastic/eui/dist/eui_theme_amsterdam_light.json';
import { useMemo } from 'react';
import { useUiSetting } from '../../../../../../src/plugins/kibana_react/public';

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
  const isDarkMode = useUiSetting('theme:darkMode');
  const theme = isDarkMode ? euiThemeAmsterdamDark : euiThemeAmsterdamLight;
  return useMemo(() => {
    return {
      copyableFieldBackground: theme.euiColorLightShade,
      descriptionText: theme.euiTextColor,
      full: theme.euiColorFullShade,
      graphControls: theme.euiColorDarkestShade,
      graphControlsBackground: theme.euiColorEmptyShade,
      graphControlsBorderColor: theme.euiColorLightShade,
      processBackingFill: `${theme.euiColorPrimary}${isDarkMode ? '1F' : '0F'}`, // Add opacity 0F = 6% , 1F = 12%
      resolverBackground: theme.euiColorEmptyShade,
      resolverEdge: isDarkMode ? theme.euiColorLightShade : theme.euiColorLightestShade,
      resolverBreadcrumbBackground: theme.euiColorLightestShade,
      resolverEdgeText: isDarkMode ? theme.euiColorFullShade : theme.euiColorDarkShade,
      triggerBackingFill: `${theme.euiColorDanger}${isDarkMode ? '1F' : '0F'}`,
      pillStroke: theme.euiColorLightShade,
      linkColor: theme.euiLinkColor,
    };
  }, [isDarkMode, theme]);
}
