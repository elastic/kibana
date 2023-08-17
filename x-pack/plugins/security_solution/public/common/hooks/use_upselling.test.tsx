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
import { UpsellingProvider } from '../components/upselling_provider';

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
const RenderWrapper: React.FunctionComponent = ({ children }) => {
  return <UpsellingProvider upsellingService={mockUpselling}>{children}</UpsellingProvider>;
};

describe('use_upselling', () => {
  test('useUpsellingComponent returns sections', () => {
    mockUpselling.setSections({
      entity_analytics_panel: TestComponent,
    });

    const { result } = renderHook(() => useUpsellingComponent('entity_analytics_panel'), {
      wrapper: RenderWrapper,
    });
    expect(result.current).toBe(TestComponent);
    expect(result.all.length).toBe(1); // assert that it should not cause unnecessary re-renders
  });

  test('useUpsellingPage returns pages', () => {
    mockUpselling.setPages({
      [SecurityPageName.hosts]: TestComponent,
    });

    const { result } = renderHook(() => useUpsellingPage(SecurityPageName.hosts), {
      wrapper: RenderWrapper,
    });
    expect(result.current).toBe(TestComponent);
  });

  test('useUpsellingMessage returns messages', () => {
    const testMessage = 'test message';
    mockUpselling.setMessages({
      investigation_guide: testMessage,
    });

    const { result } = renderHook(() => useUpsellingMessage('investigation_guide'), {
      wrapper: RenderWrapper,
    });
    expect(result.current).toBe(testMessage);
    expect(result.all.length).toBe(1); // assert that it should not cause unnecessary re-renders
  });

  test('useUpsellingMessage returns null when upsellingMessageId not found', () => {
    const emptyMessages = {};
    mockUpselling.setPages(emptyMessages);

    const { result } = renderHook(
      () => useUpsellingMessage('my_fake_message_id' as 'investigation_guide'),
      {
        wrapper: RenderWrapper,
      }
    );
    expect(result.current).toBe(null);
  });
});
