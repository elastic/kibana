/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createOrUpdateCustomLink } from '../create_or_update_custom_link';
import { CustomLink } from '../custom_link_types';
import { Setup } from '../../../helpers/setup_request';
import { mockNow } from '../../../../../../../legacy/plugins/apm/public/utils/testHelpers';

describe('Create or Update Custom link', () => {
  const internalClientIndexMock = jest.fn();
  const mockedSetup = ({
    internalClient: {
      index: internalClientIndexMock
    },
    indices: {
      apmCustomLinkIndex: 'apmCustomLinkIndex'
    }
  } as unknown) as Setup;

  const customLink = ({
    label: 'foo',
    url: 'http://elastic.com/{{trace.id}}',
    filters: {
      'service.name': 'opbeans-java',
      'transaction.type': 'Request'
    }
  } as unknown) as CustomLink;
  afterEach(() => {
    internalClientIndexMock.mockClear();
  });

  beforeAll(() => {
    mockNow(1570737000000);
  });

  it('creates a new custom link', () => {
    createOrUpdateCustomLink({ customLink, setup: mockedSetup });
    expect(internalClientIndexMock).toHaveBeenCalledWith({
      refresh: true,
      index: 'apmCustomLinkIndex',
      body: {
        '@timestamp': 1570737000000,
        label: 'foo',
        url: 'http://elastic.com/{{trace.id}}',
        filters: {
          'service.name': 'opbeans-java',
          'transaction.type': 'Request'
        }
      }
    });
  });
  it('update a new custom link', () => {
    createOrUpdateCustomLink({
      customLinkId: 'bar',
      customLink,
      setup: mockedSetup
    });
    expect(internalClientIndexMock).toHaveBeenCalledWith({
      refresh: true,
      index: 'apmCustomLinkIndex',
      id: 'bar',
      body: {
        '@timestamp': 1570737000000,
        label: 'foo',
        url: 'http://elastic.com/{{trace.id}}',
        filters: {
          'service.name': 'opbeans-java',
          'transaction.type': 'Request'
        }
      }
    });
  });
});
