/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';
import { useToasts } from '../common/lib/kibana';
import { AppMockRenderer, createAppMockRenderer, TestProviders } from '../common/mock';
import { CaseToastSuccessContent, useCasesToast } from './use_cases_toast';
import { alertComment, basicComment, mockCase } from '../containers/mock';
import React from 'react';
import userEvent from '@testing-library/user-event';
import { SupportedCaseAttachment } from '../types';

jest.mock('../common/lib/kibana');

const useToastsMock = useToasts as jest.Mock;

describe('Use cases toast hook', () => {
  const successMock = jest.fn();

  function validateTitle(title: string) {
    const mockParams = successMock.mock.calls[0][0];
    const el = document.createElement('div');
    mockParams.title(el);
    expect(el).toHaveTextContent(title);
  }

  function validateContent(content: string) {
    const mockParams = successMock.mock.calls[0][0];
    const el = document.createElement('div');
    mockParams.text(el);
    expect(el).toHaveTextContent(content);
  }

  useToastsMock.mockImplementation(() => {
    return {
      addSuccess: successMock,
    };
  });

  beforeEach(() => {
    successMock.mockClear();
  });

  describe('Toast hook', () => {
    it('should create a success toast when invoked with a case', () => {
      const { result } = renderHook(
        () => {
          return useCasesToast();
        },
        { wrapper: TestProviders }
      );
      result.current.showSuccessAttach({
        theCase: mockCase,
      });
      expect(successMock).toHaveBeenCalled();
    });
  });

  describe('toast title', () => {
    it('should create a success toast when invoked with a case and a custom title', () => {
      const { result } = renderHook(
        () => {
          return useCasesToast();
        },
        { wrapper: TestProviders }
      );
      result.current.showSuccessAttach({ theCase: mockCase, title: 'Custom title' });
      validateTitle('Custom title');
    });

    it('should display the alert sync title when called with an alert attachment ', () => {
      const { result } = renderHook(
        () => {
          return useCasesToast();
        },
        { wrapper: TestProviders }
      );
      result.current.showSuccessAttach({
        theCase: mockCase,
        attachments: [alertComment as SupportedCaseAttachment],
      });
      validateTitle('An alert has been added to "Another horrible breach!!');
    });

    it('should display a generic title when called with a non-alert attachament', () => {
      const { result } = renderHook(
        () => {
          return useCasesToast();
        },
        { wrapper: TestProviders }
      );
      result.current.showSuccessAttach({
        theCase: mockCase,
        attachments: [basicComment as SupportedCaseAttachment],
      });
      validateTitle('A case has been updated: "Another horrible breach!!"');
    });
  });
  describe('Toast content', () => {
    let appMockRender: AppMockRenderer;
    const onViewCaseClick = jest.fn();
    beforeEach(() => {
      appMockRender = createAppMockRenderer();
      onViewCaseClick.mockReset();
    });

    it('should create a success toast when invoked with a case and a custom content', () => {
      const { result } = renderHook(
        () => {
          return useCasesToast();
        },
        { wrapper: TestProviders }
      );
      result.current.showSuccessAttach({ theCase: mockCase, content: 'Custom content' });
      validateContent('Custom content');
    });

    it('renders an alert-specific content when called with an alert attachment and sync on', () => {
      const { result } = renderHook(
        () => {
          return useCasesToast();
        },
        { wrapper: TestProviders }
      );
      result.current.showSuccessAttach({
        theCase: mockCase,
        attachments: [alertComment as SupportedCaseAttachment],
      });
      validateContent('Alerts in this case have their status synched with the case status');
    });

    it('renders empty content when called with an alert attachment and sync off', () => {
      const { result } = renderHook(
        () => {
          return useCasesToast();
        },
        { wrapper: TestProviders }
      );
      result.current.showSuccessAttach({
        theCase: { ...mockCase, settings: { ...mockCase.settings, syncAlerts: false } },
        attachments: [alertComment as SupportedCaseAttachment],
      });
      validateContent('View Case');
    });

    it('renders a correct successful message content', () => {
      const result = appMockRender.render(
        <CaseToastSuccessContent content={'my content'} onViewCaseClick={onViewCaseClick} />
      );
      expect(result.getByTestId('toaster-content-sync-text')).toHaveTextContent('my content');
      expect(result.getByTestId('toaster-content-case-view-link')).toHaveTextContent('View Case');
      expect(onViewCaseClick).not.toHaveBeenCalled();
    });

    it('renders a correct successful message without content', () => {
      const result = appMockRender.render(
        <CaseToastSuccessContent onViewCaseClick={onViewCaseClick} />
      );
      expect(result.queryByTestId('toaster-content-sync-text')).toBeFalsy();
      expect(result.getByTestId('toaster-content-case-view-link')).toHaveTextContent('View Case');
      expect(onViewCaseClick).not.toHaveBeenCalled();
    });

    it('Calls the onViewCaseClick when clicked', () => {
      const result = appMockRender.render(
        <CaseToastSuccessContent onViewCaseClick={onViewCaseClick} />
      );
      userEvent.click(result.getByTestId('toaster-content-case-view-link'));
      expect(onViewCaseClick).toHaveBeenCalled();
    });
  });
});
