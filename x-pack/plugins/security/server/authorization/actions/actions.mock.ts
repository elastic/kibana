/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { ApiActions } from './api';
import { AppActions } from './app';
import { SavedObjectActions } from './saved_object';
import { SpaceActions } from './space';
import { UIActions } from './ui';
import { AlertingActions } from './alerting';
import { Actions } from './actions';

jest.mock('./api');
jest.mock('./app');
jest.mock('./saved_object');
jest.mock('./space');
jest.mock('./ui');
jest.mock('./alerting');

const create = (versionNumber: string) => {
  const t = ({
    api: new ApiActions(versionNumber),
    app: new AppActions(versionNumber),
    login: 'login:',
    savedObject: new SavedObjectActions(versionNumber),
    alerting: new AlertingActions(versionNumber),
    space: new SpaceActions(versionNumber),
    ui: new UIActions(versionNumber),
    version: `version:${versionNumber}`,
  } as unknown) as jest.Mocked<Actions>;
  return t;
};

export const actionsMock = { create };
