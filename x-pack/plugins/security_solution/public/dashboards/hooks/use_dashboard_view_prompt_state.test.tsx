/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { EuiEmptyPromptProps } from '@elastic/eui';
import { renderHook } from '@testing-library/react-hooks';
import {
  DashboardViewPromptState,
  useDashboardViewPromptState,
} from './use_dashboard_view_prompt_state';

describe('useDashboardViewPromptState', () => {
  it('returns empty state', () => {
    const { result } = renderHook<
      DashboardViewPromptState | null,
      Partial<EuiEmptyPromptProps> | null
    >(() => useDashboardViewPromptState(null));
    expect(result.current).toBeNull();
  });

  it('returns NoReadPermission state', () => {
    const { result } = renderHook<
      DashboardViewPromptState | null,
      Partial<EuiEmptyPromptProps> | null
    >(() => useDashboardViewPromptState(DashboardViewPromptState.NoReadPermission));
    expect(result.current).toMatchInlineSnapshot(`
      Object {
        "body": <p>
          Contact your administrator for help.
        </p>,
        "color": "danger",
        "iconType": "error",
        "title": <h2>
          You have no permission to read the dashboard
        </h2>,
      }
    `);
  });
});
