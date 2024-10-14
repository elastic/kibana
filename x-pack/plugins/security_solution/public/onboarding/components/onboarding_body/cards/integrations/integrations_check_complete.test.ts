/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { checkIntegrationsCardComplete } from './integrations_check_complete';
import { installationStatuses } from '@kbn/fleet-plugin/public';
import type { StartServices } from '../../../../../types';

import { lastValueFrom } from 'rxjs';

jest.mock('rxjs', () => ({
  ...jest.requireActual('rxjs'),
  lastValueFrom: jest.fn(),
}));

describe('checkIntegrationsCardComplete', () => {
  const mockHttpGet: jest.Mock = jest.fn();
  const mockSearch: jest.Mock = jest.fn();
  const mockService = {
    http: {
      get: mockHttpGet,
    },
    data: {
      search: {
        search: mockSearch,
      },
    },
  } as unknown as StartServices;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns isComplete as false when no packages are installed', async () => {
    mockHttpGet.mockResolvedValue({
      items: [],
    });

    (lastValueFrom as jest.Mock).mockResolvedValue({
      rawResponse: {
        hits: { total: 0 },
      },
    });

    const result = await checkIntegrationsCardComplete(mockService);

    expect(result).toEqual({
      isComplete: false,
      metadata: {
        installedIntegrationsCount: 0,
        isAgentRequired: false,
      },
    });
  });

  it('returns isComplete as true when packages are installed but no agent data is available', async () => {
    mockHttpGet.mockResolvedValue({
      items: [{ status: installationStatuses.Installed }],
    });

    (lastValueFrom as jest.Mock).mockResolvedValue({
      rawResponse: {
        hits: { total: 0 },
      },
    });

    const result = await checkIntegrationsCardComplete(mockService);

    expect(result).toEqual({
      isComplete: true,
      completeBadgeText: '1 integration added',
      metadata: {
        installedIntegrationsCount: 1,
        isAgentRequired: true,
      },
    });
  });

  it('returns isComplete as true and isAgentRequired as false when both packages and agent data are available', async () => {
    mockHttpGet.mockResolvedValue({
      items: [
        { status: installationStatuses.Installed },
        { status: installationStatuses.InstallFailed },
      ],
    });

    (lastValueFrom as jest.Mock).mockResolvedValue({
      rawResponse: {
        hits: { total: 1 },
      },
    });

    const result = await checkIntegrationsCardComplete(mockService);

    expect(result).toEqual({
      isComplete: true,
      completeBadgeText: '2 integrations added',
      metadata: {
        installedIntegrationsCount: 2,
        isAgentRequired: false,
      },
    });
  });
});
