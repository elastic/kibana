/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AppMountParameters, CoreStart, HttpSetup } from 'src/core/public';
import { mockApmPluginContextValue } from '../context/ApmPluginContext/MockApmPluginContext';
import { ApmPluginSetupDeps } from '../plugin';
import { renderApp } from './';
import { Observable } from 'rxjs';
import { createCallApmApi } from '../services/rest/createCallApmApi';
import { act } from '@testing-library/react';

describe('renderApp', () => {
  it('renders the app', () => {
    const { core, config } = mockApmPluginContextValue;
    const plugins = {
      licensing: { license$: new Observable() },
      triggers_actions_ui: { actionTypeRegistry: {}, alertTypeRegistry: {} },
      usageCollection: { reportUiStats: () => {} },
    };
    const params = { element: document.createElement('div') };
    jest.spyOn(window, 'scrollTo').mockReturnValueOnce(undefined);
    createCallApmApi((core.http as unknown) as HttpSetup);

    let unmount: () => void;

    act(() => {
      unmount = renderApp(
        (core as unknown) as CoreStart,
        (plugins as unknown) as ApmPluginSetupDeps,
        (params as unknown) as AppMountParameters,
        config
      );
    });

    expect(() => {
      unmount();
    }).not.toThrowError();
  });
});
