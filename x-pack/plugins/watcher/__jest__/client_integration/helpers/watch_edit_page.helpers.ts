/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { act } from 'react-dom/test-utils';

import { registerTestBed, TestBed, AsyncTestBedConfig } from '@kbn/test-jest-helpers';
import { HttpSetup } from '@kbn/core/public';

import { WatchEditPage } from '../../../public/application/sections/watch_edit_page';
import { registerRouter } from '../../../public/application/lib/navigation';
import { ROUTES } from '../../../common/constants';
import { WATCH_ID } from './jest_constants';
import { WithAppDependencies } from './setup_environment';

const testBedConfig: AsyncTestBedConfig = {
  memoryRouter: {
    onRouter: (router) => registerRouter(router),
    initialEntries: [`${ROUTES.API_ROOT}/watches/watch/${WATCH_ID}/edit`],
    componentRoutePath: `${ROUTES.API_ROOT}/watches/watch/:id/edit`,
  },
  doMountAsync: true,
};

export interface WatchEditTestBed extends TestBed<WatchEditSubjects> {
  actions: {
    clickSubmitButton: () => Promise<void>;
  };
}

export const setup = async (httpSetup: HttpSetup): Promise<WatchEditTestBed> => {
  const initTestBed = registerTestBed(WithAppDependencies(WatchEditPage, httpSetup), testBedConfig);
  const testBed = await initTestBed();

  /**
   * User Actions
   */

  const clickSubmitButton = async () => {
    await act(async () => {
      testBed.find('saveWatchButton').simulate('click');
    });

    testBed.component.update();
  };

  return {
    ...testBed,
    actions: {
      clickSubmitButton,
    },
  };
};

type WatchEditSubjects = TestSubjects;

export type TestSubjects =
  | 'idInput'
  | 'jsonWatchForm'
  | 'nameInput'
  | 'pageTitle'
  | 'jsonEditor'
  | 'thresholdWatchForm'
  | 'watchTimeFieldSelect';
