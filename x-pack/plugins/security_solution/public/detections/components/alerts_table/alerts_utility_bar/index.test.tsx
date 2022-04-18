/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { shallow, mount } from 'enzyme';

import { AlertsUtilityBar, AlertsUtilityBarProps } from '.';
import { TestProviders } from '../../../../common/mock/test_providers';

jest.useFakeTimers();
jest.mock('../../../../common/lib/kibana');

describe('AlertsUtilityBar', () => {
  test('renders correctly', () => {
    const wrapper = shallow(
      <AlertsUtilityBar
        areEventsLoading={false}
        clearSelection={jest.fn()}
        currentFilter="closed"
        hasIndexMaintenance={true}
        hasIndexWrite={true}
        onShowBuildingBlockAlertsChanged={jest.fn()}
        onShowOnlyThreatIndicatorAlertsChanged={jest.fn()}
        selectAll={jest.fn()}
        selectedEventIds={{}}
        showBuildingBlockAlerts={false}
        showClearSelection={true}
        showOnlyThreatIndicatorAlerts={false}
        totalCount={100}
        updateAlertsStatus={jest.fn()}
      />
    );

    expect(wrapper.find('[dataTestSubj="alertActionPopover"]')).toBeTruthy();
  });

  describe('UtilityBarAdditionalFiltersContent', () => {
    test('does not show the showBuildingBlockAlerts checked if the showBuildingBlockAlerts is false', () => {
      const onShowBuildingBlockAlertsChanged = jest.fn();
      const wrapper = mount(
        <TestProviders>
          <AlertsUtilityBar
            areEventsLoading={false}
            clearSelection={jest.fn()}
            currentFilter="closed"
            hasIndexMaintenance={true}
            hasIndexWrite={true}
            onShowBuildingBlockAlertsChanged={onShowBuildingBlockAlertsChanged}
            onShowOnlyThreatIndicatorAlertsChanged={jest.fn()}
            selectAll={jest.fn()}
            selectedEventIds={{}}
            showBuildingBlockAlerts={false} // Does not show showBuildingBlockAlerts checked if this is false
            showClearSelection={true}
            showOnlyThreatIndicatorAlerts={false}
            totalCount={100}
            updateAlertsStatus={jest.fn()}
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

    test('does not show the showOnlyThreatIndicatorAlerts checked if the showThreatMatchOnly is false', () => {
      const wrapper = mount(
        <TestProviders>
          <AlertsUtilityBar
            areEventsLoading={false}
            clearSelection={jest.fn()}
            currentFilter="closed"
            hasIndexMaintenance={true}
            hasIndexWrite={true}
            onShowBuildingBlockAlertsChanged={jest.fn()}
            onShowOnlyThreatIndicatorAlertsChanged={jest.fn()}
            selectAll={jest.fn()}
            selectedEventIds={{}}
            showBuildingBlockAlerts={false} // Does not show showBuildingBlockAlerts checked if this is false
            showClearSelection={true}
            showOnlyThreatIndicatorAlerts={false}
            totalCount={100}
            updateAlertsStatus={jest.fn()}
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
      ).toEqual(false);
    });

    test('does show the showBuildingBlockAlerts checked if the showBuildingBlockAlerts is true', () => {
      const onShowBuildingBlockAlertsChanged = jest.fn();
      const wrapper = mount(
        <TestProviders>
          <AlertsUtilityBar
            areEventsLoading={false}
            clearSelection={jest.fn()}
            currentFilter="closed"
            hasIndexMaintenance={true}
            hasIndexWrite={true}
            onShowBuildingBlockAlertsChanged={onShowBuildingBlockAlertsChanged}
            onShowOnlyThreatIndicatorAlertsChanged={jest.fn()}
            selectAll={jest.fn()}
            selectedEventIds={{}}
            showBuildingBlockAlerts={true} // Does show showBuildingBlockAlerts checked if this is true
            showClearSelection={true}
            showOnlyThreatIndicatorAlerts={false}
            totalCount={100}
            updateAlertsStatus={jest.fn()}
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

    test('does show the showOnlyThreatIndicatorAlerts checked if the showOnlyThreatIndicatorAlerts is true', () => {
      const wrapper = mount(
        <TestProviders>
          <AlertsUtilityBar
            areEventsLoading={false}
            clearSelection={jest.fn()}
            currentFilter="closed"
            hasIndexMaintenance={true}
            hasIndexWrite={true}
            onShowBuildingBlockAlertsChanged={jest.fn()}
            onShowOnlyThreatIndicatorAlertsChanged={jest.fn()}
            selectAll={jest.fn()}
            selectedEventIds={{}}
            showBuildingBlockAlerts={true} // Does show showBuildingBlockAlerts checked if this is true
            showClearSelection={true}
            showOnlyThreatIndicatorAlerts={true}
            totalCount={100}
            updateAlertsStatus={jest.fn()}
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
          .find('[data-test-subj="showOnlyThreatIndicatorAlertsCheckbox"] input')
          .first()
          .prop('checked')
      ).toEqual(true);
    });

    test('calls the onShowBuildingBlockAlertsChanged when the check box is clicked', () => {
      const onShowBuildingBlockAlertsChanged = jest.fn();
      const wrapper = mount(
        <TestProviders>
          <AlertsUtilityBar
            areEventsLoading={false}
            clearSelection={jest.fn()}
            currentFilter="closed"
            hasIndexMaintenance={true}
            hasIndexWrite={true}
            onShowBuildingBlockAlertsChanged={onShowBuildingBlockAlertsChanged}
            onShowOnlyThreatIndicatorAlertsChanged={jest.fn()}
            selectAll={jest.fn()}
            selectedEventIds={{}}
            showBuildingBlockAlerts={false}
            showClearSelection={true}
            showOnlyThreatIndicatorAlerts={false}
            totalCount={100}
            updateAlertsStatus={jest.fn()}
          />
        </TestProviders>
      );
      // click the filters button to popup the checkbox to make it visible
      wrapper
        .find('[data-test-subj="additionalFilters"] button')
        .first()
        .simulate('click')
        .update();

      // check the box
      wrapper
        .find('[data-test-subj="showBuildingBlockAlertsCheckbox"] input')
        .first()
        .simulate('change', { target: { checked: true } });

      // Make sure our callback is called
      expect(onShowBuildingBlockAlertsChanged).toHaveBeenCalled();
    });

    test('calls the onShowOnlyThreatIndicatorAlertsChanged when the check box is clicked', () => {
      const onShowOnlyThreatIndicatorAlertsChanged = jest.fn();
      const wrapper = mount(
        <TestProviders>
          <AlertsUtilityBar
            areEventsLoading={false}
            clearSelection={jest.fn()}
            currentFilter="closed"
            hasIndexMaintenance={true}
            hasIndexWrite={true}
            onShowBuildingBlockAlertsChanged={jest.fn()}
            onShowOnlyThreatIndicatorAlertsChanged={onShowOnlyThreatIndicatorAlertsChanged}
            selectAll={jest.fn()}
            selectedEventIds={{}}
            showBuildingBlockAlerts={false}
            showClearSelection={true}
            showOnlyThreatIndicatorAlerts={false}
            totalCount={100}
            updateAlertsStatus={jest.fn()}
          />
        </TestProviders>
      );
      // click the filters button to popup the checkbox to make it visible
      wrapper
        .find('[data-test-subj="additionalFilters"] button')
        .first()
        .simulate('click')
        .update();

      // check the box
      wrapper
        .find('[data-test-subj="showOnlyThreatIndicatorAlertsCheckbox"] input')
        .first()
        .simulate('change', { target: { checked: true } });

      // Make sure our callback is called
      expect(onShowOnlyThreatIndicatorAlertsChanged).toHaveBeenCalled();
    });

    test('can update showBuildingBlockAlerts from false to true', () => {
      const Proxy = (props: AlertsUtilityBarProps) => (
        <TestProviders>
          <AlertsUtilityBar
            areEventsLoading={false}
            clearSelection={jest.fn()}
            currentFilter="closed"
            hasIndexMaintenance={true}
            hasIndexWrite={true}
            onShowBuildingBlockAlertsChanged={jest.fn()}
            onShowOnlyThreatIndicatorAlertsChanged={jest.fn()}
            selectAll={jest.fn()}
            selectedEventIds={{}}
            showBuildingBlockAlerts={props.showBuildingBlockAlerts}
            showClearSelection={true}
            showOnlyThreatIndicatorAlerts={false}
            totalCount={100}
            updateAlertsStatus={jest.fn()}
          />
        </TestProviders>
      );

      const wrapper = mount(
        <Proxy
          areEventsLoading={false}
          clearSelection={jest.fn()}
          currentFilter="closed"
          hasIndexMaintenance={true}
          hasIndexWrite={true}
          onShowBuildingBlockAlertsChanged={jest.fn()}
          onShowOnlyThreatIndicatorAlertsChanged={jest.fn()}
          selectAll={jest.fn()}
          selectedEventIds={{}}
          showBuildingBlockAlerts={false}
          showClearSelection={true}
          showOnlyThreatIndicatorAlerts={false}
          totalCount={100}
          updateAlertsStatus={jest.fn()}
        />
      );
      // click the filters button to popup the checkbox to make it visible
      wrapper
        .find('[data-test-subj="additionalFilters"] button')
        .first()
        .simulate('click')
        .update();

      // The check box should false now since we initially set the showBuildingBlockAlerts to false
      expect(
        wrapper
          .find('[data-test-subj="showBuildingBlockAlertsCheckbox"] input')
          .first()
          .prop('checked')
      ).toEqual(false);

      wrapper.setProps({ showBuildingBlockAlerts: true });
      wrapper.update();

      // click the filters button to popup the checkbox to make it visible
      wrapper
        .find('[data-test-subj="additionalFilters"] button')
        .first()
        .simulate('click')
        .update();

      // The check box should be true now since we changed the showBuildingBlockAlerts from false to true
      expect(
        wrapper
          .find('[data-test-subj="showBuildingBlockAlertsCheckbox"] input')
          .first()
          .prop('checked')
      ).toEqual(true);
    });

    test('can update showOnlyThreatIndicatorAlerts from false to true', () => {
      const Proxy = (props: AlertsUtilityBarProps) => (
        <TestProviders>
          <AlertsUtilityBar
            areEventsLoading={false}
            clearSelection={jest.fn()}
            currentFilter="closed"
            hasIndexMaintenance={true}
            hasIndexWrite={true}
            onShowBuildingBlockAlertsChanged={jest.fn()}
            onShowOnlyThreatIndicatorAlertsChanged={jest.fn()}
            selectAll={jest.fn()}
            selectedEventIds={{}}
            showBuildingBlockAlerts={false}
            showClearSelection={true}
            showOnlyThreatIndicatorAlerts={props.showOnlyThreatIndicatorAlerts}
            totalCount={100}
            updateAlertsStatus={jest.fn()}
          />
        </TestProviders>
      );

      const wrapper = mount(
        <Proxy
          areEventsLoading={false}
          clearSelection={jest.fn()}
          currentFilter="closed"
          hasIndexMaintenance={true}
          hasIndexWrite={true}
          onShowBuildingBlockAlertsChanged={jest.fn()}
          onShowOnlyThreatIndicatorAlertsChanged={jest.fn()}
          selectAll={jest.fn()}
          selectedEventIds={{}}
          showBuildingBlockAlerts={false}
          showClearSelection={true}
          showOnlyThreatIndicatorAlerts={false}
          totalCount={100}
          updateAlertsStatus={jest.fn()}
        />
      );
      // click the filters button to popup the checkbox to make it visible
      wrapper
        .find('[data-test-subj="additionalFilters"] button')
        .first()
        .simulate('click')
        .update();

      // The check box should false now since we initially set the showBuildingBlockAlerts to false
      expect(
        wrapper
          .find('[data-test-subj="showOnlyThreatIndicatorAlertsCheckbox"] input')
          .first()
          .prop('checked')
      ).toEqual(false);

      wrapper.setProps({ showOnlyThreatIndicatorAlerts: true });
      wrapper.update();

      // click the filters button to popup the checkbox to make it visible
      wrapper
        .find('[data-test-subj="additionalFilters"] button')
        .first()
        .simulate('click')
        .update();

      // The check box should be true now since we changed the showBuildingBlockAlerts from false to true
      expect(
        wrapper
          .find('[data-test-subj="showOnlyThreatIndicatorAlertsCheckbox"] input')
          .first()
          .prop('checked')
      ).toEqual(true);
    });
  });
});
