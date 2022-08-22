/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mount } from 'enzyme';
import { AdditionalFiltersAction } from '.';

import { TestProviders } from '../../../../common/mock/test_providers';

jest.useFakeTimers();
jest.mock('../../../../common/lib/kibana');

describe('AdditionalFiltersAction', () => {
  describe('UtilityBarAdditionalFiltersContent', () => {
    test('does not show the showBuildingBlockAlerts checked if the showBuildingBlockAlerts is false', () => {
      const onShowBuildingBlockAlertsChanged = jest.fn();
      const wrapper = mount(
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
      wrapper
        .find('[data-test-subj="additionalFilters"] button')
        .first()
        .simulate('click')
        .update();

      // The check box should be false
      expect(
        wrapper
          .find('[data-test-subj="showBuildingBlockAlertsCheckbox"] input')
          .first()
          .prop('checked')
      ).toEqual(false);
    });

    test('does not show the showOnlyThreatIndicatorAlerts checked if the showOnlyThreatIndicatorAlerts is true', () => {
      const wrapper = mount(
        <TestProviders>
          <AdditionalFiltersAction
            onShowBuildingBlockAlertsChanged={jest.fn()}
            areEventsLoading={false}
            onShowOnlyThreatIndicatorAlertsChanged={jest.fn()}
            showBuildingBlockAlerts={false}
            showOnlyThreatIndicatorAlerts={true}
          />
        </TestProviders>
      );
      // click the filters button to popup the checkbox to make it visible
      wrapper
        .find('[data-test-subj="additionalFilters"] button')
        .first()
        .simulate('click')
        .update();

      // The check box should be false
      expect(
        wrapper
          .find('[data-test-subj="showOnlyThreatIndicatorAlertsCheckbox"] input')
          .first()
          .prop('checked')
      ).toEqual(true);
    });

    test('does show the showBuildingBlockAlerts checked if the showBuildingBlockAlerts is true', () => {
      const onShowBuildingBlockAlertsChanged = jest.fn();
      const wrapper = mount(
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
      wrapper
        .find('[data-test-subj="additionalFilters"] button')
        .first()
        .simulate('click')
        .update();

      // The check box should be true
      expect(
        wrapper
          .find('[data-test-subj="showBuildingBlockAlertsCheckbox"] input')
          .first()
          .prop('checked')
      ).toEqual(true);
    });
  });
});
