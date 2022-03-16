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
import { mockCase } from '../containers/mock';
import React from 'react';
import userEvent from '@testing-library/user-event';

jest.mock('../common/lib/kibana');

const useToastsMock = useToasts as jest.Mock;

describe('Use cases toast hook', () => {
  describe('Toast hook', () => {
    const successMock = jest.fn();
    useToastsMock.mockImplementation(() => {
      return {
        addSuccess: successMock,
      };
    });
    it('should create a success tost when invoked with a case', () => {
      const { result } = renderHook(
        () => {
          return useCasesToast();
        },
        { wrapper: TestProviders }
      );
      result.current.showSuccessAttach(mockCase);
      expect(successMock).toHaveBeenCalled();
    });
  });
  describe('Toast content', () => {
    let appMockRender: AppMockRenderer;
    const onViewCaseClick = jest.fn();
    beforeEach(() => {
      appMockRender = createAppMockRenderer();
      onViewCaseClick.mockReset();
    });

    it('renders a correct successfull message with synced alerts', () => {
      const result = appMockRender.render(
        <CaseToastSuccessContent syncAlerts={true} onViewCaseClick={onViewCaseClick} />
      );
      expect(result.getByTestId('toaster-content-sync-text')).toHaveTextContent(
        'Alerts in this case have their status synched with the case status'
      );
      expect(result.getByTestId('toaster-content-case-view-link')).toHaveTextContent('View Case');
      expect(onViewCaseClick).not.toHaveBeenCalled();
    });

    it('renders a correct successfull message with not synced alerts', () => {
      const result = appMockRender.render(
        <CaseToastSuccessContent syncAlerts={false} onViewCaseClick={onViewCaseClick} />
      );
      expect(result.queryByTestId('toaster-content-sync-text')).toBeFalsy();
      expect(result.getByTestId('toaster-content-case-view-link')).toHaveTextContent('View Case');
      expect(onViewCaseClick).not.toHaveBeenCalled();
    });

    it('Calls the onViewCaseClick when clicked', () => {
      const result = appMockRender.render(
        <CaseToastSuccessContent syncAlerts={false} onViewCaseClick={onViewCaseClick} />
      );
      userEvent.click(result.getByTestId('toaster-content-case-view-link'));
      expect(onViewCaseClick).toHaveBeenCalled();
    });
  });
});
