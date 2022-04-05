/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { registerTestBed, TestBed, AsyncTestBedConfig } from '@kbn/test-jest-helpers';
import { HttpSetup } from 'src/core/public';

import { WatchEdit } from '../../../public/application/sections/watch_edit/components/watch_edit';
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
    clickSubmitButton: () => void;
  };
}

export const setup = async (httpSetup: HttpSetup): Promise<WatchEditTestBed> => {
  const initTestBed = registerTestBed(WithAppDependencies(WatchEdit, httpSetup), testBedConfig);
  const testBed = await initTestBed();

  /**
   * User Actions
   */

  const clickSubmitButton = () => {
    testBed.find('saveWatchButton').simulate('click');
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
  | 'thresholdWatchForm'
  | 'watchTimeFieldSelect';
