/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StoryContext } from '@storybook/addons';
import { useEffect, useMemo, useState } from 'react';
import { BehaviorSubject } from 'rxjs';
import type { CoreTheme } from '../../../../../src/core/public';

export const useGlobalStorybookTheme = ({ globals: { euiTheme } }: StoryContext) => {
  const theme = useMemo(() => euiThemeFromId(euiTheme), [euiTheme]);
  const [theme$] = useState(() => new BehaviorSubject(theme));

  useEffect(() => {
    theme$.next(theme);
  }, [theme$, theme]);

  return {
    theme,
    theme$,
  };
};

const euiThemeFromId = (themeId: string): CoreTheme => {
  switch (themeId) {
    case 'v8.dark':
      return { darkMode: true };
    default:
      return { darkMode: false };
  }
};
