/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LENS_EMBEDDABLE_TYPE, type Embeddable as LensEmbeddable } from '@kbn/lens-plugin/public';
import { ErrorEmbeddable } from '@kbn/embeddable-plugin/public';
import type { Action } from '@kbn/ui-actions-plugin/public';
import { waitFor } from '@testing-library/react';

import { createAddToNewCaseLensAction } from './add_to_new_case';
import type { ActionContext } from './types';
import { useCasesAddToNewCaseFlyout } from '../../create/flyout/use_cases_add_to_new_case_flyout';
import React from 'react';
import { toMountPoint } from '@kbn/kibana-react-plugin/public';
import {
  getMockApplications$,
  getMockCaseUiActionProps,
  getMockCurrentAppId$,
  mockAttributes,
  MockEmbeddable,
  mockTimeRange,
} from './mocks';
import ReactDOM, { unmountComponentAtNode } from 'react-dom';
import { useKibana } from '../../../common/lib/kibana';
import { canUseCases } from '../../../client/helpers/can_use_cases';
import { getCaseOwnerByAppId } from '../../../../common/utils/owner';

const element = document.createElement('div');
document.body.appendChild(element);

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  toMountPoint: jest.fn(),
}));

jest.mock('../../../common/lib/kibana', () => {
  return {
    useKibana: jest.fn(),
    KibanaContextProvider: jest
      .fn()
      .mockImplementation(({ children, ...props }) => <div {...props}>{children}</div>),
  };
});

jest.mock('../../create/flyout/use_cases_add_to_new_case_flyout', () => ({
  useCasesAddToNewCaseFlyout: jest.fn(),
}));

jest.mock('../../../client/helpers/can_use_cases', () => {
  const actual = jest.requireActual('../../../client/helpers/can_use_cases');
  return {
    ...actual,
    canUseCases: jest.fn(),
  };
});

jest.mock('react-dom', () => {
  const original = jest.requireActual('react-dom');
  return { ...original, unmountComponentAtNode: jest.fn() };
});

jest.mock('./action_wrapper');

jest.mock('../../../../common/utils/owner', () => ({
  getCaseOwnerByAppId: jest.fn().mockReturnValue('securitySolution'),
}));

describe('createAddToNewCaseLensAction', () => {
  const mockEmbeddable = new MockEmbeddable(LENS_EMBEDDABLE_TYPE, {
    id: 'mockId',
    attributes: mockAttributes,
    timeRange: mockTimeRange,
  }) as unknown as LensEmbeddable;

  const context = {
    embeddable: mockEmbeddable,
  } as unknown as ActionContext;

  const caseUiActionProps = getMockCaseUiActionProps();

  const mockUseCasesAddToNewCaseFlyout = useCasesAddToNewCaseFlyout as jest.Mock;
  const mockOpenFlyout = jest.fn();
  const mockMount = jest.fn();
  let action: Action<ActionContext>;
  const mockCasePermissions = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseCasesAddToNewCaseFlyout.mockReturnValue({
      open: mockOpenFlyout,
    });

    (useKibana as jest.Mock).mockReturnValue({
      services: {
        application: {
          currentAppId$: getMockCurrentAppId$(),
          applications$: getMockApplications$(),
        },
      },
    });

    (canUseCases as jest.Mock).mockReturnValue(
      mockCasePermissions.mockReturnValue({ create: true, update: true })
    );

    (toMountPoint as jest.Mock).mockImplementation((node) => {
      ReactDOM.render(node, element);
      return mockMount;
    });

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
          }) as unknown as LensEmbeddable,
        })
      ).toEqual(false);
    });

    it('should return false if not lens embeddable', async () => {
      expect(
        await action.isCompatible({
          ...context,
          embeddable: new MockEmbeddable('not_lens') as unknown as LensEmbeddable,
        })
      ).toEqual(false);
    });

    it('should return false if no permission', async () => {
      mockCasePermissions.mockReturnValue({ create: false, update: false });
      expect(await action.isCompatible(context)).toEqual(false);
    });

    it('should return true if is lens embeddable', async () => {
      expect(await action.isCompatible(context)).toEqual(true);
    });

    it('should check permission with undefined if owner is not found', async () => {
      (getCaseOwnerByAppId as jest.Mock).mockReturnValue(undefined);
      await action.isCompatible(context);
      expect(mockCasePermissions).toBeCalledWith(undefined);
    });
  });

  describe('execute', () => {
    beforeEach(async () => {
      await action.execute(context);
    });

    it('should execute', () => {
      expect(toMountPoint).toHaveBeenCalled();
      expect(mockMount).toHaveBeenCalled();
    });
  });

  describe('Add to new case flyout', () => {
    beforeEach(async () => {
      await action.execute(context);
    });

    it('should open flyout', async () => {
      await waitFor(() => {
        expect(mockOpenFlyout).toHaveBeenCalledWith({
          attachments: [
            {
              persistableStateAttachmentState: {
                attributes: mockAttributes,
                timeRange: mockTimeRange,
              },
              persistableStateAttachmentTypeId: '.lens',
              type: 'persistableState',
            },
          ],
        });
      });
    });

    it('should have correct onClose handler', () => {
      const onClose = mockUseCasesAddToNewCaseFlyout.mock.calls[0][0].onClose;
      onClose();
      expect(unmountComponentAtNode as jest.Mock).toHaveBeenCalled();
    });

    it('should have correct onSuccess handler', () => {
      const onSuccess = mockUseCasesAddToNewCaseFlyout.mock.calls[0][0].onSuccess;
      onSuccess();
      expect(unmountComponentAtNode as jest.Mock).toHaveBeenCalled();
    });
  });
});
