/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaRequest } from 'kibana/server';
import uuid from 'uuid';
import { featuresPluginMock } from '../../../features/server/mocks';
import {
  PluginStartContract as FeaturesStartContract,
  KibanaFeature,
} from '../../../features/server';
import { getEnabledKibanaSpaceFeatures } from './utils';

function mockFeature(appName: string, owner?: string) {
  return new KibanaFeature({
    id: appName,
    name: appName,
    app: [],
    category: { id: 'foo', label: 'foo' },
    ...(owner
      ? {
          rac: [owner],
        }
      : {}),
    privileges: {
      all: {
        ...(owner
          ? {
              rac: {
                all: [owner],
              },
            }
          : {}),
        savedObject: {
          all: [],
          read: [],
        },
        ui: [],
      },
      read: {
        ...(owner
          ? {
              rac: {
                read: [owner],
              },
            }
          : {}),
        savedObject: {
          all: [],
          read: [],
        },
        ui: [],
      },
    },
  });
}

function mockFeatureWithSubFeature(appName: string, owner: string) {
  return new KibanaFeature({
    id: appName,
    name: appName,
    app: [],
    category: { id: 'foo', label: 'foo' },
    ...(owner
      ? {
          rac: [owner],
        }
      : {}),
    privileges: {
      all: {
        savedObject: {
          all: [],
          read: [],
        },
        ui: [],
      },
      read: {
        savedObject: {
          all: [],
          read: [],
        },
        ui: [],
      },
    },
    subFeatures: [
      {
        name: appName,
        privilegeGroups: [
          {
            groupType: 'independent',
            privileges: [
              {
                id: 'doSomethingRacRelated',
                name: 'sub feature rac',
                includeIn: 'all',
                rac: {
                  all: [owner],
                },
                savedObject: {
                  all: [],
                  read: [],
                },
                ui: ['doSomethingRacRelated'],
              },
              {
                id: 'doSomethingRacRelated',
                name: 'sub feature rac',
                includeIn: 'read',
                rac: {
                  read: [owner],
                },
                savedObject: {
                  all: [],
                  read: [],
                },
                ui: ['doSomethingRacRelated'],
              },
            ],
          },
        ],
      },
    ],
  });
}
const features: jest.Mocked<FeaturesStartContract> = featuresPluginMock.createStart();
const request = {} as KibanaRequest;
const getSpace = jest.fn();

const myAppFeature = mockFeature('myApp', 'securitySolution');
const myAppWithSubFeature = mockFeatureWithSubFeature('myAppWithSubFeature', 'observability');
const myOtherAppFeature = mockFeature('myOtherApp', 'observability');

describe('rac/authorization utils', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('#getEnabledKibanaSpaceFeatures', () => {
    test('returns empty set if no enabled features found', async () => {
      const space = {
        id: uuid.v4(),
        name: uuid.v4(),
        disabledFeatures: ['myApp'],
      };
      features.getKibanaFeatures.mockReturnValue([myAppFeature]);
      const enabledFeatures = await getEnabledKibanaSpaceFeatures({
        request,
        features,
        getSpace: getSpace.mockResolvedValue(space),
      });
      const expectedResult = new Set();

      expect(enabledFeatures).toEqual(expectedResult);
    });

    test('returns set of enabled kibana features', async () => {
      const space = {
        id: uuid.v4(),
        name: uuid.v4(),
        disabledFeatures: ['myApp'],
      };
      features.getKibanaFeatures.mockReturnValue([
        myAppFeature,
        myOtherAppFeature,
        myAppWithSubFeature,
      ]);
      const enabledFeatures = await getEnabledKibanaSpaceFeatures({
        request,
        features,
        getSpace: getSpace.mockResolvedValue(space),
      });
      const expectedResult = new Set(['observability']);

      expect(enabledFeatures).toEqual(expectedResult);
    });
  });
});
