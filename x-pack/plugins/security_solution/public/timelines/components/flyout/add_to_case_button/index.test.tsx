/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { mount } from 'enzyme';

import { useKibana } from '../../../../common/lib/kibana';
import { useDeepEqualSelector } from '../../../../common/hooks/use_selector';
import { mockTimelineModel, TestProviders } from '../../../../common/mock';
import { useAllCasesModal } from '../../../../cases/components/use_all_cases_modal';
import { AddToCaseButton } from '.';

const mockDispatch = jest.fn();
jest.mock('react-redux', () => {
  const original = jest.requireActual('react-redux');
  return {
    ...original,
    useDispatch: () => mockDispatch,
  };
});

jest.mock('../../../../common/lib/kibana');
jest.mock('../../../../common/hooks/use_selector');
jest.mock('../../../../cases/components/use_all_cases_modal');

const useKibanaMock = useKibana as jest.Mocked<typeof useKibana>;
const useAllCasesModalMock = useAllCasesModal as jest.Mock;

describe('EventColumnView', () => {
  const navigateToApp = jest.fn();

  beforeEach(() => {
    useKibanaMock().services.application.navigateToApp = navigateToApp;
    (useDeepEqualSelector as jest.Mock).mockReturnValue(mockTimelineModel);
  });

  it('navigates to the correct path without id', async () => {
    useAllCasesModalMock.mockImplementation(({ onRowClick }) => {
      onRowClick();

      return {
        modal: <>{'test'}</>,
        openModal: jest.fn(),
        isModalOpen: true,
        closeModal: jest.fn(),
      };
    });

    mount(
      <TestProviders>
        <AddToCaseButton timelineId={'timeline-1'} />
      </TestProviders>
    );

    expect(navigateToApp).toHaveBeenCalledWith('securitySolution:case', { path: '/create' });
  });

  it('navigates to the correct path with id', async () => {
    useAllCasesModalMock.mockImplementation(({ onRowClick }) => {
      onRowClick({ id: 'case-id' });

      return {
        modal: <>{'test'}</>,
        openModal: jest.fn(),
        isModalOpen: true,
        closeModal: jest.fn(),
      };
    });

    mount(
      <TestProviders>
        <AddToCaseButton timelineId={'timeline-1'} />
      </TestProviders>
    );

    expect(navigateToApp).toHaveBeenCalledWith('securitySolution:case', { path: '/case-id' });
  });
});
