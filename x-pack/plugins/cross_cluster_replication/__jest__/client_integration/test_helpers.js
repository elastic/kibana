/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import axios from 'axios';

import { registerTestBed } from '../../../../test_utils';
import { ccrStore } from '../../public/app/store';
import { setHttpClient } from '../../public/app/services/api';
import routing from '../../public/app/services/routing';

// Monck React router
const reactRouter = {
  history: {
    createHref: (location) => location.pathname,
    location: ''
  }
};
routing.reactRouter = reactRouter;
// Mock Angular $q
const $q = { defer: () => ({ resolve() {} }) };
// axios has a $http like interface so using it to simulate $http
setHttpClient(axios.create(), $q);


const initUserActions = (component, find) => {
  const clickSave = () => {
    const button = find('rollupJobSaveButton');
    button.simulate('click');
    component.update();
  };

  return {
    clickSave,
  };
};

export { nextTick } from '../../../../test_utils';

export const initTestBed = (component) => {
  const testBed = registerTestBed(component, {}, ccrStore)();
  const userActions = initUserActions(testBed.component, testBed.find);

  return {
    ...testBed,
    userActions: {
      ...userActions
    },
  };
};

export const mockServerResponses = server => {
  const mockLoadFollowerIndices = (response) => {
    const defaultResponse = {
      indices: [],
    };
    server.respondWith(/api\/cross_cluster_replication\/follower_indices/, [
      200,
      { 'Content-Type': 'application/json' },
      JSON.stringify({ ...defaultResponse, ...response }),
    ]);
  };

  // const mockCreateJob = () => {
  //   server.respondWith(/\/api\/rollup\/create/, [
  //     200,
  //     { 'Content-Type': 'application/json' },
  //     JSON.stringify({}),
  //   ]);
  // };

  // const mockUserActions = () => {
  //   server.respondWith(/\/api\/user_action\/.*/, [
  //     200,
  //     { 'Content-Type': 'application/json' },
  //     JSON.stringify({}),
  //   ]);
  // };

  mockLoadFollowerIndices();
  // mockCreateJob();
  // mockUserActions();

  return { mockLoadFollowerIndices };
};

