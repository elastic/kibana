/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// @ts-ignore
import { Feature } from '../../../../xpack_main/types';
import { IGNORED_TYPES } from '../../../common/constants';
import { Actions } from './actions';
import { privilegesFactory } from './privileges';

test(`builds privileges correctly`, () => {
  const actions = new Actions('1.0.0-zeta1');

  const savedObjectTypes = ['foo-saved-object-type', 'bar-saved-object-type', ...IGNORED_TYPES];

  const features: Feature[] = [
    {
      id: 'foo-feature',
      name: 'Foo Feature',
      icon: 'arrowDown',
      navLinkId: 'kibana:foo-feature',
      privileges: {
        all: {
          app: ['foo-app'],
          savedObject: {
            all: ['foo-saved-object-type'],
            read: ['bad-saved-object-type'],
          },
          ui: ['show', 'showSaveButton', 'showCreateButton'],
        },
        read: {
          app: ['foo-app'],
          api: ['foo/read/api'],
          savedObject: {
            all: [],
            read: ['foo-saved-object-type', 'bar-saved-object-type'],
          },
          ui: ['show'],
        },
      },
    },
    {
      id: 'bar-feature',
      name: 'Bar Feature',
      icon: 'arrowUp',
      privileges: {
        all: {
          app: ['bar-app'],
          savedObject: {
            all: ['bar-saved-object-type'],
            read: ['foo-saved-object-type'],
          },
          ui: ['show', 'showSaveButton', 'showCreateButton'],
        },
        read: {
          app: ['bar-app'],
          api: ['bar/read/api'],
          savedObject: {
            all: [],
            read: ['foo-saved-object-type', 'bar-saved-object-type'],
          },
          ui: ['show'],
        },
      },
    },
  ];

  const mockXPackMainPlugin = {
    getFeatures: jest.fn().mockReturnValue(features),
  };

  const privileges = privilegesFactory(savedObjectTypes, actions, mockXPackMainPlugin);

  // we want to make sure we don't call `xpackMainPlugin.getFeatures` until `get` is called
  // to ensure that plugins have the time to register their features before we build the privilegeMap
  expect(mockXPackMainPlugin.getFeatures).not.toHaveBeenCalled();
  expect(privileges.get()).toEqual({
    features: {
      'bar-feature': {
        all: [
          'login:',
          'version:1.0.0-zeta1',
          'app:bar-app',
          'saved_object:bar-saved-object-type/bulk_get',
          'saved_object:bar-saved-object-type/get',
          'saved_object:bar-saved-object-type/find',
          'saved_object:bar-saved-object-type/create',
          'saved_object:bar-saved-object-type/bulk_create',
          'saved_object:bar-saved-object-type/update',
          'saved_object:bar-saved-object-type/delete',
          'saved_object:foo-saved-object-type/bulk_get',
          'saved_object:foo-saved-object-type/get',
          'saved_object:foo-saved-object-type/find',
          'ui:bar-feature/show',
          'ui:bar-feature/showSaveButton',
          'ui:bar-feature/showCreateButton',
        ],
        read: [
          'login:',
          'version:1.0.0-zeta1',
          'api:bar/read/api',
          'app:bar-app',
          'saved_object:foo-saved-object-type/bulk_get',
          'saved_object:foo-saved-object-type/get',
          'saved_object:foo-saved-object-type/find',
          'saved_object:bar-saved-object-type/bulk_get',
          'saved_object:bar-saved-object-type/get',
          'saved_object:bar-saved-object-type/find',
          'ui:bar-feature/show',
        ],
      },
      'foo-feature': {
        all: [
          'login:',
          'version:1.0.0-zeta1',
          'app:foo-app',
          'saved_object:foo-saved-object-type/bulk_get',
          'saved_object:foo-saved-object-type/get',
          'saved_object:foo-saved-object-type/find',
          'saved_object:foo-saved-object-type/create',
          'saved_object:foo-saved-object-type/bulk_create',
          'saved_object:foo-saved-object-type/update',
          'saved_object:foo-saved-object-type/delete',
          'saved_object:bad-saved-object-type/bulk_get',
          'saved_object:bad-saved-object-type/get',
          'saved_object:bad-saved-object-type/find',
          'ui:foo-feature/show',
          'ui:foo-feature/showSaveButton',
          'ui:foo-feature/showCreateButton',
          'ui:navLinks/kibana:foo-feature',
        ],
        read: [
          'login:',
          'version:1.0.0-zeta1',
          'api:foo/read/api',
          'app:foo-app',
          'saved_object:foo-saved-object-type/bulk_get',
          'saved_object:foo-saved-object-type/get',
          'saved_object:foo-saved-object-type/find',
          'saved_object:bar-saved-object-type/bulk_get',
          'saved_object:bar-saved-object-type/get',
          'saved_object:bar-saved-object-type/find',
          'ui:foo-feature/show',
          'ui:navLinks/kibana:foo-feature',
        ],
      },
    },
    global: {
      all: [
        'login:',
        'version:1.0.0-zeta1',
        'api:*',
        'app:*',
        'saved_object:*',
        'space:manage',
        'ui:*',
      ],
      read: [
        'login:',
        'version:1.0.0-zeta1',
        'api:foo/read/api',
        'api:bar/read/api',
        'app:*',
        'saved_object:foo-saved-object-type/bulk_get',
        'saved_object:foo-saved-object-type/get',
        'saved_object:foo-saved-object-type/find',
        'saved_object:bar-saved-object-type/bulk_get',
        'saved_object:bar-saved-object-type/get',
        'saved_object:bar-saved-object-type/find',
        'ui:foo-feature/show',
        'ui:bar-feature/show',
        'ui:navLinks/*',
      ],
    },
    space: {
      all: [
        'login:',
        'version:1.0.0-zeta1',
        'api:*',
        'app:*',
        'saved_object:foo-saved-object-type/bulk_get',
        'saved_object:foo-saved-object-type/get',
        'saved_object:foo-saved-object-type/find',
        'saved_object:foo-saved-object-type/create',
        'saved_object:foo-saved-object-type/bulk_create',
        'saved_object:foo-saved-object-type/update',
        'saved_object:foo-saved-object-type/delete',
        'saved_object:bar-saved-object-type/bulk_get',
        'saved_object:bar-saved-object-type/get',
        'saved_object:bar-saved-object-type/find',
        'saved_object:bar-saved-object-type/create',
        'saved_object:bar-saved-object-type/bulk_create',
        'saved_object:bar-saved-object-type/update',
        'saved_object:bar-saved-object-type/delete',
        'ui:*',
      ],
      read: [
        'login:',
        'version:1.0.0-zeta1',
        'api:foo/read/api',
        'api:bar/read/api',
        'app:*',
        'saved_object:foo-saved-object-type/bulk_get',
        'saved_object:foo-saved-object-type/get',
        'saved_object:foo-saved-object-type/find',
        'saved_object:bar-saved-object-type/bulk_get',
        'saved_object:bar-saved-object-type/get',
        'saved_object:bar-saved-object-type/find',
        'ui:foo-feature/show',
        'ui:bar-feature/show',
        'ui:navLinks/*',
      ],
    },
  });
  expect(mockXPackMainPlugin.getFeatures).toHaveBeenCalled();
});
