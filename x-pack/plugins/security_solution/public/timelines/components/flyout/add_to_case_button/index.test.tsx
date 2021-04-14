/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mount } from 'enzyme';

import { useKibana } from '../../../../common/lib/kibana';
import { useDeepEqualSelector } from '../../../../common/hooks/use_selector';
import { mockTimelineModel, TestProviders } from '../../../../common/mock';
import { AddToCaseButton } from '.';
jest.mock('../../../../common/components/link_to', () => {
  const original = jest.requireActual('../../../../common/components/link_to');
  return {
    ...original,
    useFormatUrl: jest.fn().mockReturnValue({
      formatUrl: jest.fn(),
      search: '',
    }),
  };
});
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

const useKibanaMock = useKibana as jest.Mocked<typeof useKibana>;

describe('AddToCaseButton', () => {
  const navigateToApp = jest.fn();

  beforeEach(() => {
    useKibanaMock().services.application.navigateToApp = navigateToApp;
  });

  it('navigates to the correct path without id', async () => {
    useKibanaMock().services.cases.useAllCasesSelectorModal = jest
      .fn()
      .mockImplementation(({ onRowClick }) => {
        onRowClick();

        return {
          modal: <>{'test'}</>,
          openModal: jest.fn(),
          isModalOpen: true,
          closeModal: jest.fn(),
        };
      });
    (useDeepEqualSelector as jest.Mock).mockReturnValue(mockTimelineModel);
    mount(
      <TestProviders>
        <AddToCaseButton timelineId={'timeline-1'} />
      </TestProviders>
    );

    expect(navigateToApp).toHaveBeenCalledWith('securitySolution:case', { path: '/create' });
  });

  it('navigates to the correct path with id', async () => {
    useKibanaMock().services.cases.useAllCasesSelectorModal = jest
      .fn()
      .mockImplementation(({ onRowClick }) => {
        onRowClick({ id: 'case-id' });
        return {
          modal: <>{'test'}</>,
          openModal: jest.fn(),
          isModalOpen: true,
          closeModal: jest.fn(),
        };
      });
    (useDeepEqualSelector as jest.Mock).mockReturnValue(mockTimelineModel);
    mount(
      <TestProviders>
        <AddToCaseButton timelineId={'timeline-1'} />
      </TestProviders>
    );

    expect(navigateToApp).toHaveBeenCalledWith('securitySolution:case', { path: '/case-id' });
  });
});
