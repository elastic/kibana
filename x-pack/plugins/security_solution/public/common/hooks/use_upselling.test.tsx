/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';
import React from 'react';
import { SecurityPageName } from '../../../common';
import { UpsellingService } from '../lib/upsellings';
import { useUpsellingComponent, useUpsellingMessage, useUpsellingPage } from './use_upselling';

const mockUpselling = new UpsellingService();

jest.mock('../lib/kibana', () => {
  const original = jest.requireActual('../lib/kibana');
  return {
    ...original,
    useKibana: () => ({
      ...original.useKibana(),
      services: {
        ...original.useKibana().services,
        upselling: mockUpselling,
      },
    }),
  };
});

const TestComponent = () => <div>{'TEST 1 2 3'}</div>;

describe('use_upselling', () => {
  test('useUpsellingComponent returns sections', () => {
    mockUpselling.registerSections({
      entity_analytics_panel: TestComponent,
    });

    const { result } = renderHook(() => useUpsellingComponent('entity_analytics_panel'));
    expect(result.current).toBe(TestComponent);
  });

  test('useUpsellingPage returns pages', () => {
    mockUpselling.registerPages({
      [SecurityPageName.hosts]: TestComponent,
    });

    const { result } = renderHook(() => useUpsellingPage(SecurityPageName.hosts));
    expect(result.current).toBe(TestComponent);
  });

  test('useUpsellingMessage returns pages', () => {
    const testMessage = 'test message';
    mockUpselling.registerMessages({
      investigation_guide: testMessage,
    });

    const { result } = renderHook(() => useUpsellingMessage('investigation_guide'));
    expect(result.current).toBe(testMessage);
  });
});
