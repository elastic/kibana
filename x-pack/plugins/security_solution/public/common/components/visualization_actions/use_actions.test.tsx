/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import React from 'react';
import { NavigationProvider } from '@kbn/security-solution-navigation';
import { useKibana } from '../../lib/kibana/kibana_react';
import { mockAttributes } from './mocks';
import { DEFAULT_ACTIONS, useActions } from './use_actions';
import { coreMock } from '@kbn/core/public/mocks';
import { TestProviders } from '../../mock';

jest.mock('./use_add_to_existing_case', () => {
  return {
    useAddToExistingCase: jest.fn().mockReturnValue({
      disabled: false,
      onAddToExistingCaseClicked: jest.fn(),
    }),
  };
});
jest.mock('./use_add_to_new_case', () => {
  return {
    useAddToNewCase: jest.fn().mockReturnValue({
      disabled: false,
      onAddToNewCaseClicked: jest.fn(),
    }),
  };
});
jest.mock('../../lib/kibana/kibana_react', () => {
  return {
    useKibana: jest.fn(),
  };
});

const coreStart = coreMock.createStart();
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <TestProviders>
    <NavigationProvider core={coreStart}>{children}</NavigationProvider>
  </TestProviders>
);
describe(`useActions`, () => {
  const mockNavigateToPrefilledEditor = jest.fn();
  beforeAll(() => {
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        lens: {
          navigateToPrefilledEditor: mockNavigateToPrefilledEditor,
          canUseEditor: jest.fn().mockReturnValue(true),
          SaveModalComponent: jest
            .fn()
            .mockReturnValue(() => <div data-test-subj="saveModalComponent" />),
        },
        notifications: {
          toasts: {
            addWarning: jest.fn(),
          },
        },
      },
    });
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render actions', () => {
    const { result } = renderHook(
      () =>
        useActions({
          withActions: DEFAULT_ACTIONS,
          attributes: mockAttributes,
          timeRange: {
            from: '2022-10-26T23:00:00.000Z',
            to: '2022-11-03T15:16:50.053Z',
          },
          inspectActionProps: {
            handleInspectClick: jest.fn(),
            isInspectButtonDisabled: false,
          },
        }),
      {
        wrapper,
      }
    );
    expect(result.current[0].id).toEqual('inspect');
    expect(result.current[0].order).toEqual(4);
    expect(result.current[1].id).toEqual('addToNewCase');
    expect(result.current[1].order).toEqual(3);
    expect(result.current[2].id).toEqual('addToExistingCase');
    expect(result.current[2].order).toEqual(2);
    expect(result.current[3].id).toEqual('saveToLibrary');
    expect(result.current[3].order).toEqual(1);
    expect(result.current[4].id).toEqual('openInLens');
    expect(result.current[4].order).toEqual(0);
  });

  it('should render extra actions if available', () => {
    const mockExtraAction = [
      {
        id: 'mockExtraAction',
        getDisplayName(): string {
          return 'mockExtraAction';
        },
        getIconType(): string | undefined {
          return 'editorRedo';
        },
        type: 'actionButton',
        async isCompatible(): Promise<boolean> {
          return true;
        },
        async execute(): Promise<void> {},
        order: 0,
      },
    ];
    const { result } = renderHook(
      () =>
        useActions({
          withActions: DEFAULT_ACTIONS,
          attributes: mockAttributes,
          timeRange: {
            from: '2022-10-26T23:00:00.000Z',
            to: '2022-11-03T15:16:50.053Z',
          },
          inspectActionProps: {
            handleInspectClick: jest.fn(),
            isInspectButtonDisabled: false,
          },
          extraActions: mockExtraAction,
        }),
      {
        wrapper,
      }
    );

    expect(result.current[0].id).toEqual('inspect');
    expect(result.current[0].order).toEqual(5);
    expect(result.current[1].id).toEqual('addToNewCase');
    expect(result.current[1].order).toEqual(4);
    expect(result.current[2].id).toEqual('addToExistingCase');
    expect(result.current[2].order).toEqual(3);
    expect(result.current[3].id).toEqual('saveToLibrary');
    expect(result.current[3].order).toEqual(2);
    expect(result.current[4].id).toEqual('openInLens');
    expect(result.current[4].order).toEqual(1);
    expect(result.current[5].id).toEqual('mockExtraAction');
    expect(result.current[5].order).toEqual(0);
  });
});
