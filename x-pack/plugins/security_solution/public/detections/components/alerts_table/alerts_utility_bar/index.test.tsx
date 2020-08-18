/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow, mount } from 'enzyme';

import { AlertsUtilityBar, AlertsUtilityBarProps } from './index';
import { TestProviders } from '../../../../common/mock/test_providers';

jest.mock('../../../../common/lib/kibana');

describe('AlertsUtilityBar', () => {
  test('renders correctly', () => {
    const wrapper = shallow(
      <AlertsUtilityBar
        canUserCRUD={true}
        hasIndexWrite={true}
        areEventsLoading={false}
        clearSelection={jest.fn()}
        totalCount={100}
        selectedEventIds={{}}
        currentFilter="closed"
        selectAll={jest.fn()}
        showClearSelection={true}
        showBuildingBlockAlerts={false}
        onShowBuildingBlockAlertsChanged={jest.fn()}
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
            canUserCRUD={true}
            hasIndexWrite={true}
            areEventsLoading={false}
            clearSelection={jest.fn()}
            totalCount={100}
            selectedEventIds={{}}
            currentFilter="closed"
            selectAll={jest.fn()}
            showClearSelection={true}
            showBuildingBlockAlerts={false} // Does not show showBuildingBlockAlerts checked if this is false
            onShowBuildingBlockAlertsChanged={onShowBuildingBlockAlertsChanged}
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

    test('does show the showBuildingBlockAlerts checked if the showBuildingBlockAlerts is true', () => {
      const onShowBuildingBlockAlertsChanged = jest.fn();
      const wrapper = mount(
        <TestProviders>
          <AlertsUtilityBar
            canUserCRUD={true}
            hasIndexWrite={true}
            areEventsLoading={false}
            clearSelection={jest.fn()}
            totalCount={100}
            selectedEventIds={{}}
            currentFilter="closed"
            selectAll={jest.fn()}
            showClearSelection={true}
            showBuildingBlockAlerts={true} // Does show showBuildingBlockAlerts checked if this is true
            onShowBuildingBlockAlertsChanged={onShowBuildingBlockAlertsChanged}
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

    test('calls the onShowBuildingBlockAlertsChanged when the check box is clicked', () => {
      const onShowBuildingBlockAlertsChanged = jest.fn();
      const wrapper = mount(
        <TestProviders>
          <AlertsUtilityBar
            canUserCRUD={true}
            hasIndexWrite={true}
            areEventsLoading={false}
            clearSelection={jest.fn()}
            totalCount={100}
            selectedEventIds={{}}
            currentFilter="closed"
            selectAll={jest.fn()}
            showClearSelection={true}
            showBuildingBlockAlerts={false}
            onShowBuildingBlockAlertsChanged={onShowBuildingBlockAlertsChanged}
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

    test('can update showBuildingBlockAlerts from false to true', () => {
      const Proxy = (props: AlertsUtilityBarProps) => (
        <TestProviders>
          <AlertsUtilityBar
            canUserCRUD={true}
            hasIndexWrite={true}
            areEventsLoading={false}
            clearSelection={jest.fn()}
            totalCount={100}
            selectedEventIds={{}}
            currentFilter="closed"
            selectAll={jest.fn()}
            showClearSelection={true}
            showBuildingBlockAlerts={props.showBuildingBlockAlerts}
            onShowBuildingBlockAlertsChanged={jest.fn()}
            updateAlertsStatus={jest.fn()}
          />
        </TestProviders>
      );

      const wrapper = mount(
        <Proxy
          canUserCRUD={true}
          hasIndexWrite={true}
          areEventsLoading={false}
          clearSelection={jest.fn()}
          totalCount={100}
          selectedEventIds={{}}
          currentFilter="closed"
          selectAll={jest.fn()}
          showClearSelection={true}
          showBuildingBlockAlerts={false}
          onShowBuildingBlockAlertsChanged={jest.fn()}
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
  });
});
