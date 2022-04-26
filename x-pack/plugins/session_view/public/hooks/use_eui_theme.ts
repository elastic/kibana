/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { shade, useEuiTheme as useEuiThemeHook } from '@elastic/eui';
import { euiLightVars, euiDarkVars } from '@kbn/ui-theme';

type EuiThemeProps = Parameters<typeof useEuiThemeHook>;
type ExtraEuiVars = {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  euiColorVis3_asText: string;
  // eslint-disable-next-line @typescript-eslint/naming-convention
  euiColorVis6_asText: string;
};
type EuiVars = typeof euiLightVars & ExtraEuiVars;
type EuiThemeReturn = ReturnType<typeof useEuiThemeHook> & { euiVars: EuiVars };

export const useEuiTheme = (...props: EuiThemeProps): EuiThemeReturn => {
  const euiThemeHook = useEuiThemeHook(...props);

  const vars = euiThemeHook.colorMode === 'DARK' ? euiDarkVars : euiLightVars;

  const extraEuiVars: ExtraEuiVars = {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    euiColorVis3_asText: shade(vars.euiColorVis3, 0.148),
    // eslint-disable-next-line @typescript-eslint/naming-convention
    euiColorVis6_asText: shade(vars.euiColorVis6, 0.335),
  };

  const euiVars = {
    ...vars,
    ...extraEuiVars,
  };

  return {
    ...euiThemeHook,
    euiVars,
  };
};
