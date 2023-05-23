/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LENS_EMBEDDABLE_TYPE } from '@kbn/lens-plugin/public';
import { ErrorEmbeddable } from '@kbn/embeddable-plugin/public';
import type { Action } from '@kbn/ui-actions-plugin/public';

import { createAddToNewCaseLensAction } from './add_to_new_case';
import type { ActionContext, DashboardVisualizationEmbeddable } from './types';
import { useCasesAddToExistingCaseModal } from '../../all_cases/selector_modal/use_cases_add_to_existing_case_modal';
import { getCasePermissions } from './utils';
import React from 'react';
import { toMountPoint } from '@kbn/kibana-react-plugin/public';
import { getMockCaseUiActionProps, mockAttributes, MockEmbeddable } from './mocks';

jest.mock('../../all_cases/selector_modal/use_cases_add_to_existing_case_modal', () => ({
  useCasesAddToExistingCaseModal: jest.fn(),
}));

jest.mock('./utils', () => {
  const actual = jest.requireActual('./utils');
  return {
    ...actual,
    getCasePermissions: jest.fn(),
  };
});

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  toMountPoint: jest.fn(),
  KibanaThemeProvider: jest.fn().mockImplementation(({ children }) => <>{children}</>),
}));

describe('createAddToNewCaseLensAction', () => {
  const mockEmbeddable = new MockEmbeddable(LENS_EMBEDDABLE_TYPE, {
    id: 'mockId',
    attributes: mockAttributes,
    timeRange: { from: '', to: '', fromStr: '', toStr: '' },
  }) as unknown as DashboardVisualizationEmbeddable;

  const context = {
    embeddable: mockEmbeddable,
  } as unknown as ActionContext;

  const caseUiActionProps = getMockCaseUiActionProps();

  const mockUseCasesAddToExistingCaseModal = useCasesAddToExistingCaseModal as jest.Mock;
  const mockOpenModal = jest.fn();
  const mockMount = jest.fn();
  let action: Action<ActionContext>;
  beforeAll(() => {
    mockUseCasesAddToExistingCaseModal.mockReturnValue({
      open: mockOpenModal,
    });
  });

  beforeEach(() => {
    (toMountPoint as jest.Mock).mockImplementation(() => {
      return mockMount;
    });
    (getCasePermissions as jest.Mock).mockReturnValue({ update: true, read: true });

    jest.clearAllMocks();
    action = createAddToNewCaseLensAction(caseUiActionProps);
  });

  test('it should return display name', () => {
    expect(action.getDisplayName(context)).toEqual('Add to new case');
  });

  it('should return icon type', () => {
    expect(action.getIconType(context)).toEqual('casesApp');
  });

  describe('isCompatible', () => {
    it('should return false if error embeddable', async () => {
      expect(
        await action.isCompatible({
          ...context,
          embeddable: new ErrorEmbeddable('some error', {
            id: '123',
          }) as unknown as DashboardVisualizationEmbeddable,
        })
      ).toEqual(false);
    });

    it('should return false if not lens embeddable', async () => {
      expect(
        await action.isCompatible({
          ...context,
          embeddable: new MockEmbeddable('not_lens') as unknown as DashboardVisualizationEmbeddable,
        })
      ).toEqual(false);
    });

    it('should return false if no permission', async () => {
      (getCasePermissions as jest.Mock).mockReturnValue({ update: false, read: false });
      expect(await action.isCompatible(context)).toEqual(true);
    });

    it('should return true if lens embeddable', async () => {
      expect(await action.isCompatible(context)).toEqual(true);
    });
  });

  describe('execute', () => {
    it('should execute', async () => {
      await action.execute(context);
      expect(mockMount).toHaveBeenCalled();
    });
  });
});
