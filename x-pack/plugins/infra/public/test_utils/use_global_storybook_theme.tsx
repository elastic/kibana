/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StoryContext } from '@storybook/addons';
import React, { useEffect, useMemo, useState } from 'react';
import { BehaviorSubject } from 'rxjs';
import type { CoreTheme } from '../../../../../src/core/public';
import { EuiThemeProvider } from '../../../../../src/plugins/kibana_react/common';
import { KibanaThemeProvider } from '../../../../../src/plugins/kibana_react/public';

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

export const GlobalStorybookThemeProviders: React.FC<{ storyContext: StoryContext }> = ({
  children,
  storyContext,
}) => {
  const { theme, theme$ } = useGlobalStorybookTheme(storyContext);
  return (
    <KibanaThemeProvider theme$={theme$}>
      <EuiThemeProvider darkMode={theme.darkMode}>{children}</EuiThemeProvider>
    </KibanaThemeProvider>
  );
};

export const decorateWithGlobalStorybookThemeProviders = <
  StoryFnReactReturnType extends React.ReactNode
>(
  wrappedStory: () => StoryFnReactReturnType,
  storyContext: StoryContext
) => (
  <GlobalStorybookThemeProviders storyContext={storyContext}>
    {wrappedStory()}
  </GlobalStorybookThemeProviders>
);

const euiThemeFromId = (themeId: string): CoreTheme => {
  switch (themeId) {
    case 'v8.dark':
      return { darkMode: true };
    default:
      return { darkMode: false };
  }
};
