/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useIsElementMounted } from '../../detection_engine/rule_management_ui/components/rules_table/rules_table/guided_onboarding/use_is_element_mounted';
import { render, screen } from '@testing-library/react';
import {
  createMockStore,
  createSecuritySolutionStorageMock,
  TestProviders,
} from '../../common/mock';
import { useKibana as mockUseKibana } from '../../common/lib/kibana/__mocks__';
import { useKibana } from '../../common/lib/kibana';
import { AttackDiscoveryTour } from '.';
import { ATTACK_DISCOVERY_TOUR_CONFIG_ANCHORS } from './step_config';
import { NEW_FEATURES_TOUR_STORAGE_KEYS, SecurityPageName } from '../../../common/constants';
import type { RouteSpyState } from '../../common/utils/route/types';
import { useRouteSpy } from '../../common/utils/route/use_route_spy';

const mockRouteSpy: RouteSpyState = {
  pageName: SecurityPageName.overview,
  detailName: undefined,
  tabName: undefined,
  search: '',
  pathName: '/',
};
jest.mock(
  '../../detection_engine/rule_management_ui/components/rules_table/rules_table/guided_onboarding/use_is_element_mounted'
);
jest.mock('../../common/lib/kibana');
jest.mock('../../common/utils/route/use_route_spy');
jest.mock('@elastic/eui', () => {
  const original = jest.requireActual('@elastic/eui');
  return {
    ...original,
    EuiTourStep: () => <div data-test-subj="attackDiscovery-tour-step-1" />,
  };
});
const mockedUseKibana = mockUseKibana();

const { storage: storageMock } = createSecuritySolutionStorageMock();
const mockStore = createMockStore(undefined, undefined, undefined, storageMock);

const TestComponent = () => {
  return (
    <TestProviders store={mockStore}>
      <div id={ATTACK_DISCOVERY_TOUR_CONFIG_ANCHORS.NAV_LINK} />
      <AttackDiscoveryTour />
    </TestProviders>
  );
};

describe('Attack discovery tour', () => {
  beforeAll(() => {
    (useIsElementMounted as jest.Mock).mockReturnValue(true);
    (useRouteSpy as jest.Mock).mockReturnValue([mockRouteSpy]);
  });

  beforeEach(() => {
    (useKibana as jest.Mock).mockReturnValue({
      ...mockedUseKibana,
      services: {
        ...mockedUseKibana.services,
        storage: storageMock,
      },
    });

    storageMock.clear();
  });
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should not render tour step 1 when element is not mounted', () => {
    (useIsElementMounted as jest.Mock).mockReturnValueOnce(false);
    render(<TestComponent />);
    expect(screen.queryByTestId('attackDiscovery-tour-step-1')).toBeNull();
  });

  it('should not render any tour steps when tour is not activated', () => {
    storageMock.set(NEW_FEATURES_TOUR_STORAGE_KEYS.ATTACK_DISCOVERY, {
      currentTourStep: 1,
      isTourActive: false,
    });
    render(<TestComponent />);
    expect(screen.queryByTestId('attackDiscovery-tour-step-1')).toBeNull();
    expect(screen.queryByTestId('attackDiscovery-tour-step-2')).toBeNull();
  });

  it('should not render any tour steps when tour is on step 2 and page is not attack discovery', () => {
    storageMock.set(NEW_FEATURES_TOUR_STORAGE_KEYS.ATTACK_DISCOVERY, {
      currentTourStep: 2,
      isTourActive: true,
    });
    const { debug } = render(<TestComponent />);
    expect(screen.queryByTestId('attackDiscovery-tour-step-1')).toBeNull();
    debug();
  });

  it('should  render tour step 1 when element is mounted', async () => {
    const { getByTestId } = render(<TestComponent />);

    expect(getByTestId('attackDiscovery-tour-step-1')).toBeInTheDocument();
  });

  it('should render tour video when tour is on step 2 and page is attack discovery', () => {
    (useRouteSpy as jest.Mock).mockReturnValue([
      { ...mockRouteSpy, pageName: SecurityPageName.attackDiscovery },
    ]);
    storageMock.set(NEW_FEATURES_TOUR_STORAGE_KEYS.ATTACK_DISCOVERY, {
      currentTourStep: 2,
      isTourActive: true,
    });
    const { getByTestId } = render(<TestComponent />);
    expect(screen.queryByTestId('attackDiscovery-tour-step-1')).toBeNull();
    expect(getByTestId('attackDiscovery-tour-step-2')).toBeInTheDocument();
  });

  it('should advance to tour step 2 when page is attack discovery', () => {
    (useRouteSpy as jest.Mock).mockReturnValue([
      { ...mockRouteSpy, pageName: SecurityPageName.attackDiscovery },
    ]);
    storageMock.set(NEW_FEATURES_TOUR_STORAGE_KEYS.ATTACK_DISCOVERY, {
      currentTourStep: 1,
      isTourActive: true,
    });
    render(<TestComponent />);
    expect(
      storageMock.get(NEW_FEATURES_TOUR_STORAGE_KEYS.ATTACK_DISCOVERY).currentTourStep
    ).toEqual(2);
  });
});
