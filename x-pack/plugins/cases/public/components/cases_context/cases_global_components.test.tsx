/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { getAllCasesSelectorModalNoProviderLazy } from '../../client/ui/get_all_cases_selector_modal';
import { getCreateCaseFlyoutLazyNoProvider } from '../../client/ui/get_create_case_flyout';
import { AppMockRenderer, createAppMockRenderer } from '../../common/mock';
import { getInitialCasesContextState } from './cases_context_reducer';
import { CasesGlobalComponents } from './cases_global_components';

jest.mock('../../client/ui/get_create_case_flyout');
jest.mock('../../client/ui/get_all_cases_selector_modal');

const getCreateCaseFlyoutLazyNoProviderMock = getCreateCaseFlyoutLazyNoProvider as jest.Mock;
const getAllCasesSelectorModalNoProviderLazyMock =
  getAllCasesSelectorModalNoProviderLazy as jest.Mock;

describe('Cases context UI', () => {
  let appMock: AppMockRenderer;

  beforeEach(() => {
    appMock = createAppMockRenderer();
    getCreateCaseFlyoutLazyNoProviderMock.mockClear();
  });

  describe('create case flyout', () => {
    it('should render the create case flyout when isFlyoutOpen is true', async () => {
      const state = {
        ...getInitialCasesContextState(),
        createCaseFlyout: {
          isFlyoutOpen: true,
          props: {
            attachments: [],
          },
        },
      };
      appMock.render(<CasesGlobalComponents state={state} />);
      expect(getCreateCaseFlyoutLazyNoProviderMock).toHaveBeenCalledWith({ attachments: [] });
    });

    it('should not render the create case flyout when isFlyoutOpen is false', async () => {
      const state = {
        ...getInitialCasesContextState(),
        createCaseFlyout: {
          isFlyoutOpen: false,
        },
      };
      appMock.render(<CasesGlobalComponents state={state} />);
      expect(getCreateCaseFlyoutLazyNoProviderMock).not.toHaveBeenCalled();
    });
  });

  describe('select case modal', () => {
    it('should render the select case modal when isModalOpen is true', async () => {
      const onRowClick = jest.fn();
      const state = {
        ...getInitialCasesContextState(),
        selectCaseModal: {
          isModalOpen: true,
          props: {
            attachments: [],
            onRowClick,
          },
        },
      };
      appMock.render(<CasesGlobalComponents state={state} />);
      expect(getAllCasesSelectorModalNoProviderLazyMock).toHaveBeenCalledWith({
        attachments: [],
        onRowClick,
      });
    });

    it('should not render the select case modal when isModalOpen is false', async () => {
      const state = {
        ...getInitialCasesContextState(),
        selectCaseModal: {
          isModalOpen: false,
        },
      };
      appMock.render(<CasesGlobalComponents state={state} />);
      expect(getAllCasesSelectorModalNoProviderLazyMock).toHaveBeenCalled();
    });
  });
});
