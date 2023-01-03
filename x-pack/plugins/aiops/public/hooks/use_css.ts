/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import { useEuiBreakpoint } from '@elastic/eui';
import { euiThemeVars } from '@kbn/ui-theme';

// Define fully static CSS outside hook.
const dataViewTitleHeader = css({
  'min-width': '300px',
  padding: `${euiThemeVars.euiSizeS} 0`,
  display: 'flex',
  'flex-direction': 'row',
  'align-items': 'center',
});

export const useCss = () => {
  // Define CSS referencing inline dependencies within hook.
  const aiopsPageHeader = css({
    [useEuiBreakpoint(['xs', 's', 'm', 'l'])]: {
      'flex-direction': 'column',
      'align-items': 'flex-start',
    },
  });

  return { dataViewTitleHeader, aiopsPageHeader };
};
