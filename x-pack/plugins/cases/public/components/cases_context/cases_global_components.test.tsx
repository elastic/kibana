/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { AppMockRenderer, createAppMockRenderer } from '../../common/mock';
import { getCreateCaseFlyoutLazyNoProvider } from '../../methods/get_create_case_flyout';
import { CasesGlobalComponents } from './cases_global_components';

jest.mock('../../methods/get_create_case_flyout');

const getCreateCaseFlyoutLazyNoProviderMock = getCreateCaseFlyoutLazyNoProvider as jest.Mock;

describe('Cases context UI', () => {
  let appMock: AppMockRenderer;

  beforeEach(() => {
    appMock = createAppMockRenderer();
    getCreateCaseFlyoutLazyNoProviderMock.mockClear();
  });

  describe('create case flyout', () => {
    it('should render the create case flyout when isFlyoutOpen is true', async () => {
      const state = {
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
        createCaseFlyout: {
          isFlyoutOpen: false,
        },
      };
      appMock.render(<CasesGlobalComponents state={state} />);
      expect(getCreateCaseFlyoutLazyNoProviderMock).not.toHaveBeenCalled();
    });
  });
});
