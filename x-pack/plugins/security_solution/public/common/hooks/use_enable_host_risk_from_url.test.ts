/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';
import { useEnableHostRiskFromUrl } from './use_enable_host_risk_from_url';

jest.mock('./use_space_id', () => {
  return { useSpaceId: () => 'myspace' };
});

describe('useEnableHostRiskFromUrl', () => {
  beforeAll(() => {
    Object.defineProperty(window, 'location', {
      value: {
        port: 'testPort',
        protocol: 'testProtocol',
        hostname: 'testhostname',
      },
    });
  });

  it('renders the correct path', () => {
    const { result } = renderHook(() => useEnableHostRiskFromUrl());
    expect(result.current).toEqual(
      '/s/myspace/app/dev_tools#/console?load_from=testProtocol//testhostname:testPort/s/myspace/internal/prebuilt_content/dev_tool/enable_host_risk_score'
    );
  });
});
