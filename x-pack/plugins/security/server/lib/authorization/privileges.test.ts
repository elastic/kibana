/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// @ts-ignore
import { Feature } from '../../../../xpack_main/types';
import { actionsFactory } from './actions';
import { buildPrivilegeMap } from './privileges';

const createMockConfig = (settings: Record<string, any> = {}) => {
  return {
    get: (key: string) => settings[key],
  };
};

test(`snapshot test`, () => {
  const actions = actionsFactory(
    createMockConfig({
      'pkg.version': '1.0.0',
    })
  );
  // this isn't a definitive list, and we could be using entirely made up savedObjectTypes
  // here, but it makes more sense to use at least the types that we're associating with the
  // feature specific privileges
  const savedObjectTypes = [
    'canvas-workpad',
    'config',
    'dashboard',
    'graph-workspace',
    'index-pattern',
    'search',
    'space',
    'telemetry',
    'timelion-sheet',
    'url',
    'visualization',
  ];

  const features: Feature[] = [
    {
      id: 'foo',
      name: 'Foo',
      icon: 'arrowDown',
      privileges: {
        all: {
          app: ['foo'],
          savedObject: {
            all: ['search'],
            read: ['config', 'index-pattern'],
          },
          ui: ['show', 'showSaveButton', 'showCreateButton'],
        },
        read: {
          app: ['foo'],
          savedObject: {
            all: [],
            read: ['config', 'index-pattern', 'search'],
          },
          ui: ['show'],
        },
      },
    },
    {
      id: 'bar',
      name: 'Bar',
      icon: 'arrowUp',
      privileges: {
        all: {
          app: ['bar'],
          savedObject: {
            all: ['visualization'],
            read: ['config', 'index-pattern', 'search'],
          },
          ui: ['show', 'showSaveButton', 'showCreateButton'],
        },
        read: {
          app: ['bar'],
          savedObject: {
            all: [],
            read: ['config', 'index-pattern', 'search', 'visualization'],
          },
          ui: ['show'],
        },
      },
    },
  ];

  expect(buildPrivilegeMap(savedObjectTypes, actions, features)).toMatchSnapshot();
});
