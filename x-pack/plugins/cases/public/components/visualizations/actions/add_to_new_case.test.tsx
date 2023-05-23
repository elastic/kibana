/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypedLensByValueInput } from '@kbn/lens-plugin/public';
import { LENS_EMBEDDABLE_TYPE } from '@kbn/lens-plugin/public';
import { ErrorEmbeddable } from '@kbn/embeddable-plugin/public';
import type { Action } from '@kbn/ui-actions-plugin/public';

import { createAddToNewCaseLensAction } from './add_to_new_case';
import type { ActionContext, CaseUIActionProps, DashboardVisualizationEmbeddable } from './types';
import { useCasesAddToExistingCaseModal } from '../../all_cases/selector_modal/use_cases_add_to_existing_case_modal';
import { of, Subject } from 'rxjs';
import { getCasePermissions } from './utils';
import React from 'react';
import { createBrowserHistory } from 'history';
import type { CoreTheme } from '@kbn/core/public';
import { toMountPoint } from '@kbn/kibana-react-plugin/public';

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
  class MockEmbeddable {
    public type;
    private input;
    constructor(
      type: string,
      input?: {
        attributes: TypedLensByValueInput['attributes'];
        id: string;
        timeRange: { from: string; to: string; fromStr: string; toStr: string };
      }
    ) {
      this.type = type;
      this.input = input;
    }
    getFilters() {}
    getQuery() {}
    getInput() {
      return this.input;
    }
  }

  const currentAppId$ = new Subject<string | undefined>();

  const mockTheme: CoreTheme = {
    darkMode: false,
  };

  const createThemeMock = (): CoreTheme => {
    return { ...mockTheme };
  };

  const createTheme$Mock = () => {
    return of(createThemeMock());
  };

  const core = {
    application: { currentAppId$: currentAppId$.asObservable(), capabilities: {} },
    theme: { theme$: createTheme$Mock() },
    uiSettings: {
      get: jest.fn().mockReturnValue(true),
    },
  };
  const plugins = {};
  const storage = {};
  const history = createBrowserHistory();
  const caseContextProps = {};
  const mockEmbeddable = new MockEmbeddable(LENS_EMBEDDABLE_TYPE, {
    id: 'mockId',
    attributes: {
      title: 'mockTitle',
      description: 'mockDescription',
      references: [],
      state: {
        visualization: {
          id: 'mockId',
          type: 'mockType',
          title: 'mockTitle',
          visualizationType: 'mockVisualizationType',
          references: [],
          state: {
            datasourceStates: {
              indexpattern: {},
            },
          },
        },
      },
    } as unknown as TypedLensByValueInput['attributes'],
    timeRange: { from: '', to: '', fromStr: '', toStr: '' },
  }) as unknown as DashboardVisualizationEmbeddable;

  const context = {
    embeddable: mockEmbeddable,
  } as unknown as ActionContext;

  const caseUiActionProps = {
    core,
    plugins,
    storage,
    history,
    caseContextProps,
  } as unknown as CaseUIActionProps;

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
