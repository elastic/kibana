/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject } from 'rxjs';
import { renderHook } from '@testing-library/react-hooks';
import { useKibana } from './lib/kibana';
import { useIsDarkTheme } from './use_is_dark_theme';
import type { CoreTheme } from '@kbn/core-theme-browser';
import type { AppMockRenderer } from './mock';
import { createAppMockRenderer } from './mock';

jest.mock('./lib/kibana');

const useKibanaMock = useKibana as jest.Mocked<typeof useKibana>;

describe('useIsDarkTheme', () => {
  let appMockRender: AppMockRenderer;

  beforeEach(() => {
    appMockRender = createAppMockRenderer();
    useKibanaMock().services.theme.theme$ = new BehaviorSubject<CoreTheme>({ darkMode: true });
  });

  it('returns true if the theme is in dark mode', async () => {
    const { result } = renderHook(() => useIsDarkTheme(), {
      wrapper: appMockRender.AppWrapper,
    });

    expect(result.current).toBe(true);
  });

  it('returns the default theme if the theme service is undefined', async () => {
    // @ts-expect-error: service maybe undefined
    useKibanaMock().services.theme = undefined;

    const { result } = renderHook(() => useIsDarkTheme(), {
      wrapper: appMockRender.AppWrapper,
    });

    expect(result.current).toBe(false);
  });
});
