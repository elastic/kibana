/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { useKibana } from '../../../../common/lib/kibana';
import { useDeepEqualSelector } from '../../../../common/hooks/use_selector';
import { mockTimelineModel, TestProviders } from '../../../../common/mock';
import { AddToCaseButton } from '.';
import { SecurityPageName } from '../../../../../common/constants';

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
    const here = jest.fn();
    useKibanaMock().services.cases.ui.getAllCasesSelectorModal = here.mockImplementation(
      ({ onRowClick }) => {
        onRowClick();
        return <></>;
      }
    );
    (useDeepEqualSelector as jest.Mock).mockReturnValue(mockTimelineModel);
    render(
      <TestProviders>
        <AddToCaseButton timelineId={'timeline-1'} />
      </TestProviders>
    );
    userEvent.click(screen.getByTestId('attach-timeline-case-button'));
    userEvent.click(screen.getByTestId('attach-timeline-existing-case'));

    expect(navigateToApp).toHaveBeenCalledWith('securitySolutionUI', {
      path: '/create',
      deepLinkId: SecurityPageName.case,
    });
  });

  it('navigates to the correct path with id', async () => {
    useKibanaMock().services.cases.ui.getAllCasesSelectorModal = jest
      .fn()
      .mockImplementation(({ onRowClick }) => {
        onRowClick({ id: 'case-id' });
        return <></>;
      });
    (useDeepEqualSelector as jest.Mock).mockReturnValue(mockTimelineModel);
    render(
      <TestProviders>
        <AddToCaseButton timelineId={'timeline-1'} />
      </TestProviders>
    );
    userEvent.click(screen.getByTestId('attach-timeline-case-button'));
    userEvent.click(screen.getByTestId('attach-timeline-existing-case'));

    expect(navigateToApp).toHaveBeenCalledWith('securitySolutionUI', {
      path: '/case-id',
      deepLinkId: SecurityPageName.case,
    });
  });
});
