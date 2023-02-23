/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, renderHook } from '@testing-library/react-hooks';
import { useAddToCaseActions } from './use_add_to_case_actions';
import { TestProviders } from '../../../../common/mock';
import { useGetUserCasesPermissions, useKibana } from '../../../../common/lib/kibana';
import { useTourContext } from '../../../../common/components/guided_onboarding_tour';
import {
  AlertsCasesTourSteps,
  sampleCase,
} from '../../../../common/components/guided_onboarding_tour/tour_config';
import { CasesTourSteps } from '../../../../common/components/guided_onboarding_tour/cases_tour_steps';

jest.mock('../../../../common/components/guided_onboarding_tour');
jest.mock('../../../../common/lib/kibana');
const mockTourStep = jest
  .fn()
  .mockImplementation(({ children }: { children: React.ReactNode }) => (
    <span data-test-subj="contextMenuMock">{children}</span>
  ));
jest.mock('@elastic/eui', () => {
  const original = jest.requireActual('@elastic/eui');
  return {
    ...original,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    EuiContextMenuItem: (props: any) => mockTourStep(props),
  };
});

const defaultProps = {
  onMenuItemClick: () => null,
  isActiveTimelines: false,
  isInDetections: true,
  ecsData: {
    _id: '123',
    event: {
      kind: ['signal'],
    },
  },
};

describe('useAddToCaseActions', () => {
  const open = jest.fn();
  const submit = jest.fn();
  const addToNewCase = jest.fn().mockReturnValue({
    open,
    submit,
  });
  beforeEach(() => {
    (useTourContext as jest.Mock).mockReturnValue({
      activeStep: 1,
      incrementStep: () => null,
      isTourShown: () => false,
    });
    (useGetUserCasesPermissions as jest.Mock).mockReturnValue({
      all: true,
      create: true,
      read: true,
      update: true,
      delete: true,
      push: true,
    });
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        cases: {
          hooks: {
            getUseCasesAddToNewCaseFlyout: addToNewCase,
            getUseCasesAddToExistingCaseModal: () => null,
          },
          helpers: {
            getRuleIdFromEvent: () => null,
          },
        },
      },
    });
    jest.clearAllMocks();
  });
  it('should render case options when event is alert ', () => {
    const { result } = renderHook(() => useAddToCaseActions(defaultProps), {
      wrapper: TestProviders,
    });
    expect(result.current.addToCaseActionItems.length).toEqual(2);
    expect(result.current.addToCaseActionItems[0].props['data-test-subj']).toEqual(
      'add-to-existing-case-action'
    );
    expect(result.current.addToCaseActionItems[1].props['data-test-subj']).toEqual(
      'add-to-new-case-action'
    );
  });
  it('should not render case options when event is not alert ', () => {
    const { result } = renderHook(
      () => useAddToCaseActions({ ...defaultProps, ecsData: { _id: '123' } }),
      {
        wrapper: TestProviders,
      }
    );
    expect(result.current.addToCaseActionItems.length).toEqual(0);
  });
  it('should call getUseCasesAddToNewCaseFlyout with attachments only when step is not active', () => {
    const { result } = renderHook(() => useAddToCaseActions(defaultProps), {
      wrapper: TestProviders,
    });
    act(() => {
      result.current.handleAddToNewCaseClick();
    });
    expect(open).toHaveBeenCalledWith({
      attachments: [{ alertId: '123', index: '', rule: null, type: 'alert' }],
    });
  });
  it('should call getUseCasesAddToNewCaseFlyout with tour step with step is active and increment step', () => {
    const incrementStep = jest.fn();
    (useTourContext as jest.Mock).mockReturnValue({
      activeStep: AlertsCasesTourSteps.addAlertToCase,
      incrementStep,
      isTourShown: () => true,
    });
    const { result } = renderHook(() => useAddToCaseActions(defaultProps), {
      wrapper: TestProviders,
    });
    act(() => {
      result.current.handleAddToNewCaseClick();
    });
    expect(open).toHaveBeenCalledWith({
      attachments: [{ alertId: '123', index: '', rule: null, type: 'alert' }],
      headerContent: <CasesTourSteps />,
    });
    expect(incrementStep).toHaveBeenCalled();
  });
  it('should prefill getUseCasesAddToNewCaseFlyout with tour step when step is active', () => {
    (useTourContext as jest.Mock).mockReturnValue({
      activeStep: AlertsCasesTourSteps.addAlertToCase,
      incrementStep: () => null,
      isTourShown: () => true,
    });
    renderHook(() => useAddToCaseActions(defaultProps), {
      wrapper: TestProviders,
    });
    expect(addToNewCase.mock.calls[0][0].initialValue).toEqual(sampleCase);
  });
  it('should not prefill getUseCasesAddToNewCaseFlyout with tour step when step is not active', () => {
    renderHook(() => useAddToCaseActions(defaultProps), {
      wrapper: TestProviders,
    });
    expect(addToNewCase.mock.calls[0][0]).not.toHaveProperty('initialValue');
  });
});
