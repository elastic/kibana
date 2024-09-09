/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DecoratorFn } from '@storybook/react';
import React, { useEffect, useMemo, useState } from 'react';
import { BehaviorSubject } from 'rxjs';
import type { CoreTheme } from '@kbn/core/public';
import { EuiThemeProvider } from '@kbn/kibana-react-plugin/common';
import { KibanaThemeProvider } from '@kbn/react-kibana-context-theme';

type StoryContext = Parameters<DecoratorFn>[1];

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

export function GlobalStorybookThemeProviders({
  children,
  storyContext,
}: {
  storyContext: StoryContext;
  children: React.ReactChild;
}) {
  const { theme, theme$ } = useGlobalStorybookTheme(storyContext);
  return (
    <KibanaThemeProvider theme={{ theme$ }}>
      <EuiThemeProvider darkMode={theme.darkMode}>{children}</EuiThemeProvider>
    </KibanaThemeProvider>
  );
}

export const decorateWithGlobalStorybookThemeProviders: DecoratorFn = (
  wrappedStory,
  storyContext
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
