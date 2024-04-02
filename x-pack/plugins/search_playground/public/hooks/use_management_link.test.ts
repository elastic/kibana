/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';
import { useManagementLink } from './use_management_link';
import { useKibana } from './use_kibana';

jest.mock('./use_kibana', () => ({
  useKibana: jest.fn(),
}));

describe('useManagementLink Hook', () => {
  const mockGetUrl = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        share: {
          url: {
            locators: {
              get: jest.fn().mockReturnValue({
                getUrl: mockGetUrl,
              }),
            },
          },
        },
      },
    });
  });

  it('generates the management link successfully', async () => {
    const expectedUrl =
      'http://localhost:5601/app/management/insightsAndAlerting/triggersActionsConnectors';
    mockGetUrl.mockResolvedValue(expectedUrl);
    const { result, waitForNextUpdate } = renderHook(() => useManagementLink());
    await waitForNextUpdate();

    expect(result.current).toBe(expectedUrl);
    expect(mockGetUrl).toHaveBeenCalledWith({
      sectionId: 'insightsAndAlerting',
      appId: 'triggersActionsConnectors',
    });
  });

  it('return empty link when management locator is not found', async () => {
    (useKibana as jest.Mock).mockReturnValueOnce({
      services: {
        share: {
          url: {
            locators: {
              get: jest.fn().mockReturnValue(undefined),
            },
          },
        },
      },
    });

    const { result, waitForNextUpdate } = renderHook(() => useManagementLink());
    await waitForNextUpdate();

    expect(result.current).toBe('');
  });
});
