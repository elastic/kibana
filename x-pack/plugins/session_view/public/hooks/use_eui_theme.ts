/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { shade, useEuiTheme as useEuiThemeHook } from '@elastic/eui';
import { euiLightVars, euiDarkVars } from '@kbn/ui-theme';
import { useMemo } from 'react';

type EuiThemeProps = Parameters<typeof useEuiThemeHook>;
type ExtraEuiVars = {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  euiColorVis6_asText: string;
  buttonsBackgroundNormalDefaultPrimary: string;
  terminalOutputBackground: string;
  terminalOutputMarkerAccent: string;
  terminalOutputMarkerWarning: string;
  terminalOutputSliderBackground: string;
};
type EuiVars = typeof euiLightVars & ExtraEuiVars;
type EuiThemeReturn = ReturnType<typeof useEuiThemeHook> & { euiVars: EuiVars };

// Not all Eui Tokens were fully migrated to @elastic/eui/useEuiTheme yet, so
// this hook overrides the default useEuiTheme hook to provide a custom hook that
// allows the use the euiVars tokens from the euiLightVars and euiDarkVars
export const useEuiTheme = (...props: EuiThemeProps): EuiThemeReturn => {
  const euiThemeHook = useEuiThemeHook(...props);

  const euiVars = useMemo(() => {
    const themeVars = euiThemeHook.colorMode === 'DARK' ? euiDarkVars : euiLightVars;

    const extraEuiVars: ExtraEuiVars = {
      // eslint-disable-next-line @typescript-eslint/naming-convention
      euiColorVis6_asText: shade(themeVars.euiColorVis6, 0.335),
      buttonsBackgroundNormalDefaultPrimary: '#006DE4',
      // Terminal Output Colors don't change with the theme
      terminalOutputBackground: '#1d1e23',
      terminalOutputMarkerAccent: euiLightVars.euiColorAccent,
      terminalOutputMarkerWarning: euiDarkVars.euiColorWarning,
      terminalOutputSliderBackground: euiLightVars.euiColorDarkestShade,
    };

    return {
      ...themeVars,
      ...extraEuiVars,
    };
  }, [euiThemeHook.colorMode]);

  return {
    ...euiThemeHook,
    euiVars,
  };
};
