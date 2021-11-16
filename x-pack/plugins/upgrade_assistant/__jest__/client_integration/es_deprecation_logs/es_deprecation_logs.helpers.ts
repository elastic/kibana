/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from 'react-dom/test-utils';
import { registerTestBed, TestBed, AsyncTestBedConfig } from '@kbn/test/jest';
import { getFixLogsStep } from '../../../public/application/components/es_deprecation_logs/fix_deprecation_logs';
import { WithAppDependencies } from '../helpers';

const testBedConfig: AsyncTestBedConfig = {
  memoryRouter: {
    initialEntries: [`/overview`],
    componentRoutePath: '/overview',
  },
  doMountAsync: true,
};

export type EsDeprecationLogsTestBed = TestBed & {
  actions: ReturnType<typeof createActions>;
};

const createActions = (testBed: TestBed) => {
  /**
   * User Actions
   */

  const clickDeprecationToggle = async () => {
    const { find, component } = testBed;

    await act(async () => {
      find('deprecationLoggingToggle').simulate('click');
    });

    component.update();
  };

  const clickRetryButton = async () => {
    const { find, component } = testBed;

    await act(async () => {
      find('retryButton').simulate('click');
    });

    component.update();
  };

  const clickResetButton = async () => {
    const { find, component } = testBed;

    await act(async () => {
      find('resetLastStoredDate').simulate('click');
    });

    component.update();
  };

  const clickViewSystemIndicesState = async () => {
    const { find, component } = testBed;

    await act(async () => {
      find('viewSystemIndicesStateButton').simulate('click');
    });

    component.update();
  };

  const clickRetrySystemIndicesButton = async () => {
    const { find, component } = testBed;

    await act(async () => {
      find('systemIndicesStatusRetryButton').simulate('click');
    });

    component.update();
  };

  return {
    clickDeprecationToggle,
    clickRetryButton,
    clickResetButton,
    clickViewSystemIndicesState,
    clickRetrySystemIndicesButton,
  };
};

export const setupESDeprecationLogsPage = async (
  overrides?: Record<string, unknown>
): Promise<EsDeprecationLogsTestBed> => {
  const initTestBed = registerTestBed(
    WithAppDependencies(getFixLogsStep, overrides),
    testBedConfig
  );
  const testBed = await initTestBed();

  return {
    ...testBed,
    actions: createActions(testBed),
  };
};
