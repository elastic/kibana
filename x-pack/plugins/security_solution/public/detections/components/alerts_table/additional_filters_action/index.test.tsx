/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

import { AdditionalFiltersAction } from '.';
import { TestProviders } from '../../../../common/mock/test_providers';

jest.useFakeTimers({ legacyFakeTimers: true });
jest.mock('../../../../common/lib/kibana');

describe('AdditionalFiltersAction', () => {
  describe('UtilityBarAdditionalFiltersContent', () => {
    test('does not show the showBuildingBlockAlerts checked if the showBuildingBlockAlerts is false', async () => {
      const onShowBuildingBlockAlertsChanged = jest.fn();
      render(
        <TestProviders>
          <AdditionalFiltersAction
            onShowBuildingBlockAlertsChanged={onShowBuildingBlockAlertsChanged}
            areEventsLoading={false}
            onShowOnlyThreatIndicatorAlertsChanged={jest.fn()}
            showBuildingBlockAlerts={false}
            showOnlyThreatIndicatorAlerts={false}
          />
        </TestProviders>
      );
      // click the filters button to popup the checkbox to make it visible
      const additionalFiltersButton = screen.findByTestId('additionalFilters-popover');
      fireEvent.click(await additionalFiltersButton);

      // The check box should be false
      expect(await screen.findByTestId('showBuildingBlockAlertsCheckbox')).not.toBeChecked();
      expect(screen.queryByTestId('additionalFiltersCountBadge')).toBeNull();
    });

    test('does not show the showOnlyThreatIndicatorAlerts checked if the showOnlyThreatIndicatorAlerts is false', async () => {
      render(
        <TestProviders>
          <AdditionalFiltersAction
            onShowBuildingBlockAlertsChanged={jest.fn()}
            areEventsLoading={false}
            onShowOnlyThreatIndicatorAlertsChanged={jest.fn()}
            showBuildingBlockAlerts={false}
            showOnlyThreatIndicatorAlerts={false}
          />
        </TestProviders>
      );
      // click the filters button to popup the checkbox to make it visible
      const additionalFiltersButton = screen.findByTestId('additionalFilters-popover');
      fireEvent.click(await additionalFiltersButton);

      expect(await screen.findByTestId('showOnlyThreatIndicatorAlertsCheckbox')).not.toBeChecked();
      expect(screen.queryByTestId('additionalFiltersCountBadge')).toBeNull();
    });

    test('does show the showBuildingBlockAlerts checked if the showBuildingBlockAlerts is true', async () => {
      const onShowBuildingBlockAlertsChanged = jest.fn();
      render(
        <TestProviders>
          <AdditionalFiltersAction
            onShowBuildingBlockAlertsChanged={onShowBuildingBlockAlertsChanged}
            areEventsLoading={false}
            onShowOnlyThreatIndicatorAlertsChanged={jest.fn()}
            showBuildingBlockAlerts={true}
            showOnlyThreatIndicatorAlerts={false}
          />
        </TestProviders>
      );
      // click the filters button to popup the checkbox to make it visible
      const additionalFiltersButton = screen.findByTestId('additionalFilters-popover');
      fireEvent.click(await additionalFiltersButton);

      // The check box should be true
      expect(await screen.findByTestId('showBuildingBlockAlertsCheckbox')).toBeChecked();
      expect(await screen.findByTestId('additionalFiltersCountBadge')).toHaveTextContent('1');
    });

    test('Shows both filters checked with correct filter count badge if showBuildingBlockAlerts is true and showOnlyThreatIndicatorAlerts is true', async () => {
      const onShowBuildingBlockAlertsChanged = jest.fn();
      render(
        <TestProviders>
          <AdditionalFiltersAction
            onShowBuildingBlockAlertsChanged={onShowBuildingBlockAlertsChanged}
            areEventsLoading={false}
            onShowOnlyThreatIndicatorAlertsChanged={jest.fn()}
            showBuildingBlockAlerts={true}
            showOnlyThreatIndicatorAlerts={true}
          />
        </TestProviders>
      );
      // click the filters button to popup the checkbox to make it visible
      const additionalFiltersButton = screen.findByTestId('additionalFilters-popover');
      fireEvent.click(await additionalFiltersButton);

      expect(await screen.findByTestId('showBuildingBlockAlertsCheckbox')).toBeChecked();
      expect(await screen.findByTestId('showOnlyThreatIndicatorAlertsCheckbox')).toBeChecked();
      expect(await screen.findByTestId('additionalFiltersCountBadge')).toHaveTextContent('2');
    });
  });
});
