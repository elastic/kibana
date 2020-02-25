/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createOrUpdateCustomAction } from '../create_or_update_custom_action';
import { CustomAction } from '../custom_action_types';
import { Setup } from '../../../helpers/setup_request';
import { mockNow } from '../../../../../../../legacy/plugins/apm/public/utils/testHelpers';

describe('Create or Update Custom Action', () => {
  const internalClientIndexMock = jest.fn();
  const mockedSetup = ({
    internalClient: {
      index: internalClientIndexMock
    },
    indices: {
      apmCustomActionIndex: 'apmCustomActionIndex'
    }
  } as unknown) as Setup;

  const customAction = ({
    label: 'foo',
    url: 'http://elastic.com/{{trace.id}}',
    filters: {
      'service.name': 'opbeans-java',
      'transaction.type': 'Request'
    },
    actionId: 'trace'
  } as unknown) as CustomAction;
  afterEach(() => {
    internalClientIndexMock.mockClear();
  });

  beforeAll(() => {
    mockNow(1570737000000);
  });

  it('creates a new custom action', () => {
    createOrUpdateCustomAction({ customAction, setup: mockedSetup });
    expect(internalClientIndexMock).toHaveBeenCalledWith({
      refresh: true,
      index: 'apmCustomActionIndex',
      body: {
        '@timestamp': 1570737000000,
        label: 'foo',
        url: 'http://elastic.com/{{trace.id}}',
        filters: {
          'service.name': 'opbeans-java',
          'transaction.type': 'Request'
        },
        actionId: 'trace'
      }
    });
  });
  it('update a new custom action', () => {
    createOrUpdateCustomAction({
      customActionId: 'bar',
      customAction,
      setup: mockedSetup
    });
    expect(internalClientIndexMock).toHaveBeenCalledWith({
      refresh: true,
      index: 'apmCustomActionIndex',
      id: 'bar',
      body: {
        '@timestamp': 1570737000000,
        label: 'foo',
        url: 'http://elastic.com/{{trace.id}}',
        filters: {
          'service.name': 'opbeans-java',
          'transaction.type': 'Request'
        },
        actionId: 'trace'
      }
    });
  });
});
