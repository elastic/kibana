/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useHostIpToName } from './use_host_ip_to_name';
import { renderHook } from '@testing-library/react-hooks';

const renderUseHostIpToNameHook = () =>
  renderHook((props) => useHostIpToName(props.ipAddress, props.indexPattern), {
    initialProps: { ipAddress: '127.0.0.1', indexPattern: 'metricbest-*' },
  });

const mockedFetch = jest.fn();

jest.mock('@kbn/kibana-react-plugin/public', () => {
  return {
    useKibana: () => {
      return {
        services: {
          http: {
            fetch: mockedFetch,
          },
        },
      };
    },
  };
});

describe('useHostIpToName Hook', () => {
  it('should basically work', async () => {
    mockedFetch.mockResolvedValue({ host: 'example-01' } as any);
    const { result, waitForNextUpdate } = renderUseHostIpToNameHook();
    expect(result.current.name).toBe(null);
    expect(result.current.loading).toBe(true);
    await waitForNextUpdate();
    expect(result.current.name).toBe('example-01');
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe(null);
  });

  it('should handle errors', async () => {
    const error = new Error('Host not found');
    mockedFetch.mockRejectedValue(error);
    const { result, waitForNextUpdate } = renderUseHostIpToNameHook();
    expect(result.current.name).toBe(null);
    expect(result.current.loading).toBe(true);
    await waitForNextUpdate();
    expect(result.current.name).toBe(null);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe(error);
  });

  it('should reset errors', async () => {
    const error = new Error('Host not found');
    mockedFetch.mockRejectedValue(error);
    const { result, waitForNextUpdate, rerender } = renderUseHostIpToNameHook();
    expect(result.current.name).toBe(null);
    expect(result.current.loading).toBe(true);
    await waitForNextUpdate();
    expect(result.current.name).toBe(null);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe(error);
    mockedFetch.mockResolvedValue({ host: 'example-01' } as any);
    rerender({ ipAddress: '192.168.1.2', indexPattern: 'metricbeat-*' });
    await waitForNextUpdate();
    expect(result.current.name).toBe('example-01');
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe(null);
  });
});
