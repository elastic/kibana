/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { registerTestBed, TestBed, TestBedConfig } from '../../../../../test_utils';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { WatchEdit } from '../../../public/application/sections/watch_edit/components/watch_edit';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { registerRouter } from '../../../public/application/lib/navigation';
import { ROUTES } from '../../../common/constants';
import { WATCH_ID } from './constants';
import { withAppContext } from './app_context.mock';

const testBedConfig: TestBedConfig = {
  memoryRouter: {
    onRouter: (router) => registerRouter(router),
    initialEntries: [`${ROUTES.API_ROOT}/watches/watch/${WATCH_ID}/edit`],
    componentRoutePath: `${ROUTES.API_ROOT}/watches/watch/:id/edit`,
  },
  doMountAsync: true,
};

const initTestBed = registerTestBed(withAppContext(WatchEdit), testBedConfig);

export interface WatchEditTestBed extends TestBed<WatchEditSubjects> {
  actions: {
    clickSubmitButton: () => void;
  };
}

export const setup = async (): Promise<WatchEditTestBed> => {
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
