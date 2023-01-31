/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';
import { useKibana } from '../../lib/kibana/kibana_react';
import { mockAttributes } from './mocks';
import { useActions } from './use_actions';

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

describe(`useActions`, () => {
  const mockNavigateToPrefilledEditor = jest.fn();
  beforeAll(() => {
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        lens: {
          navigateToPrefilledEditor: mockNavigateToPrefilledEditor,
        },
      },
    });
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render actions', () => {
    const { result } = renderHook(() =>
      useActions({
        withActions: true,
        attributes: mockAttributes,
        timeRange: {
          from: '2022-10-26T23:00:00.000Z',
          to: '2022-11-03T15:16:50.053Z',
        },
        inspectActionProps: {
          onInspectActionClicked: jest.fn(),
          isDisabled: false,
        },
      })
    );

    expect(result.current[0].id).toEqual('inspect');
    expect(result.current[0].order).toEqual(4);
    expect(result.current[1].id).toEqual('openInLens');
    expect(result.current[1].order).toEqual(3);
    expect(result.current[2].id).toEqual('addToNewCase');
    expect(result.current[2].order).toEqual(2);
    expect(result.current[3].id).toEqual('addToExistingCase');
    expect(result.current[3].order).toEqual(1);
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
    const { result } = renderHook(() =>
      useActions({
        withActions: true,
        attributes: mockAttributes,
        timeRange: {
          from: '2022-10-26T23:00:00.000Z',
          to: '2022-11-03T15:16:50.053Z',
        },
        inspectActionProps: {
          onInspectActionClicked: jest.fn(),
          isDisabled: false,
        },
        extraActions: mockExtraAction,
      })
    );

    expect(result.current[0].id).toEqual('inspect');
    expect(result.current[0].order).toEqual(4);
    expect(result.current[1].id).toEqual('openInLens');
    expect(result.current[1].order).toEqual(3);
    expect(result.current[2].id).toEqual('addToNewCase');
    expect(result.current[2].order).toEqual(2);
    expect(result.current[3].id).toEqual('addToExistingCase');
    expect(result.current[3].order).toEqual(1);
    expect(result.current[4].id).toEqual('mockExtraAction');
    expect(result.current[4].order).toEqual(0);
  });
});
