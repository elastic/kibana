/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useKibana } from '../../common/lib/kibana';
import { useIsOsqueryAvailableSimple } from './use_is_osquery_available_simple';
import { renderHook } from '@testing-library/react-hooks';
import { createStartServicesMock } from '@kbn/triggers-actions-ui-plugin/public/common/lib/kibana/kibana_react.mock';
import { OSQUERY_INTEGRATION_NAME } from '../../../common';
import { httpServiceMock } from '@kbn/core/public/mocks';

jest.mock('../../common/lib/kibana');

const response = {
  item: {
    policy_id: '4234234234',
    package_policies: [
      {
        package: { name: OSQUERY_INTEGRATION_NAME },
        enabled: true,
      },
    ],
  },
};

describe('UseIsOsqueryAvailableSimple', () => {
  const mockedHttp = httpServiceMock.createStartContract();
  mockedHttp.get.mockResolvedValue(response);
  beforeAll(() => {
    (useKibana as jest.Mock).mockImplementation(() => {
      const mockStartServicesMock = createStartServicesMock();

      return {
        services: {
          ...mockStartServicesMock,
          http: mockedHttp,
        },
      };
    });
  });
  it('should expect response from API and return enabled flag', async () => {
    const { result, waitForValueToChange } = renderHook(() =>
      useIsOsqueryAvailableSimple({
        agentId: '3242332',
      })
    );

    expect(result.current).toBe(false);
    await waitForValueToChange(() => result.current);

    expect(result.current).toBe(true);
  });
});
