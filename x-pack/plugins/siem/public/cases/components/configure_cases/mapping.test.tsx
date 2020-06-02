/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { mount, ReactWrapper } from 'enzyme';

import { TestProviders } from '../../../common/mock';
import { Mapping, MappingProps } from './mapping';
import { mapping } from './__mock__';

describe('Mapping', () => {
  let wrapper: ReactWrapper;
  const onChangeMapping = jest.fn();
  const setEditFlyoutVisibility = jest.fn();
  const props: MappingProps = {
    disabled: false,
    mapping,
    updateConnectorDisabled: false,
    onChangeMapping,
    setEditFlyoutVisibility,
    connectorActionTypeId: '.servicenow',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    wrapper = mount(<Mapping {...props} />, { wrappingComponent: TestProviders });
  });

  afterEach(() => {
    wrapper.unmount();
  });

  describe('Common', () => {
    test('it shows mapping form group', () => {
      expect(wrapper.find('[data-test-subj="case-mapping-form-group"]').first().exists()).toBe(
        true
      );
    });

    test('it shows mapping form row', () => {
      expect(wrapper.find('[data-test-subj="case-mapping-form-row"]').first().exists()).toBe(true);
    });

    test('it shows the update button', () => {
      expect(
        wrapper.find('[data-test-subj="case-mapping-update-connector-button"]').first().exists()
      ).toBe(true);
    });

    test('it shows the field mapping', () => {
      expect(wrapper.find('[data-test-subj="case-mapping-field"]').first().exists()).toBe(true);
    });

    test('it updates thirdParty correctly', () => {
      wrapper
        .find('button[data-test-subj="case-configure-third-party-select-title"]')
        .simulate('click');
      wrapper.update();
      wrapper.find('button[data-test-subj="dropdown-mapping-description"]').simulate('click');
      wrapper.update();

      expect(onChangeMapping).toHaveBeenCalledWith([
        { source: 'title', target: 'description', actionType: 'overwrite' },
        { source: 'description', target: 'not_mapped', actionType: 'append' },
        { source: 'comments', target: 'comments', actionType: 'append' },
      ]);
    });

    test('it updates actionType correctly', () => {
      wrapper
        .find('button[data-test-subj="case-configure-action-type-select-title"]')
        .simulate('click');
      wrapper.update();
      wrapper.find('button[data-test-subj="edit-update-option-nothing"]').simulate('click');
      wrapper.update();

      expect(onChangeMapping).toHaveBeenCalledWith([
        { source: 'title', target: 'short_description', actionType: 'nothing' },
        { source: 'description', target: 'description', actionType: 'append' },
        { source: 'comments', target: 'comments', actionType: 'append' },
      ]);
    });

    test('it shows the correct action types', () => {
      wrapper
        .find('button[data-test-subj="case-configure-action-type-select-title"]')
        .simulate('click');
      wrapper.update();
      expect(
        wrapper.find('button[data-test-subj="edit-update-option-nothing"]').first().exists()
      ).toBeTruthy();
      expect(
        wrapper.find('button[data-test-subj="edit-update-option-overwrite"]').first().exists()
      ).toBeTruthy();
      expect(
        wrapper.find('button[data-test-subj="edit-update-option-append"]').first().exists()
      ).toBeTruthy();
    });
  });

  describe('Connectors', () => {
    describe('ServiceNow', () => {
      test('it shows the correct thirdParty fields for title', () => {
        wrapper
          .find('button[data-test-subj="case-configure-third-party-select-title"]')
          .simulate('click');
        wrapper.update();

        expect(
          wrapper
            .find('button[data-test-subj="dropdown-mapping-short_description"]')
            .first()
            .exists()
        ).toBeTruthy();
        expect(
          wrapper.find('button[data-test-subj="dropdown-mapping-description"]').first().exists()
        ).toBeTruthy();
        expect(
          wrapper.find('button[data-test-subj="dropdown-mapping-not_mapped"]').first().exists()
        ).toBeTruthy();
      });

      test('it shows the correct thirdParty fields for description', () => {
        wrapper
          .find('button[data-test-subj="case-configure-third-party-select-description"]')
          .simulate('click');
        wrapper.update();

        expect(
          wrapper
            .find('button[data-test-subj="dropdown-mapping-short_description"]')
            .first()
            .exists()
        ).toBeTruthy();
        expect(
          wrapper.find('button[data-test-subj="dropdown-mapping-description"]').first().exists()
        ).toBeTruthy();
        expect(
          wrapper.find('button[data-test-subj="dropdown-mapping-not_mapped"]').first().exists()
        ).toBeTruthy();
      });

      test('it shows the correct thirdParty fields for comments', () => {
        wrapper
          .find('button[data-test-subj="case-configure-third-party-select-comments"]')
          .simulate('click');
        wrapper.update();

        expect(
          wrapper.find('button[data-test-subj="dropdown-mapping-comments"]').first().exists()
        ).toBeTruthy();
        expect(
          wrapper.find('button[data-test-subj="dropdown-mapping-not_mapped"]').first().exists()
        ).toBeTruthy();
      });
    });

    describe('Jira', () => {
      beforeEach(() => {
        wrapper = mount(<Mapping {...props} connectorActionTypeId={'.jira'} />, {
          wrappingComponent: TestProviders,
        });
      });

      test('it shows the correct thirdParty fields for title', () => {
        wrapper
          .find('button[data-test-subj="case-configure-third-party-select-title"]')
          .simulate('click');
        wrapper.update();

        expect(
          wrapper.find('button[data-test-subj="dropdown-mapping-summary"]').first().exists()
        ).toBeTruthy();
        expect(
          wrapper.find('button[data-test-subj="dropdown-mapping-description"]').first().exists()
        ).toBeTruthy();
        expect(
          wrapper.find('button[data-test-subj="dropdown-mapping-not_mapped"]').first().exists()
        ).toBeTruthy();
      });

      test('it shows the correct thirdParty fields for description', () => {
        wrapper
          .find('button[data-test-subj="case-configure-third-party-select-description"]')
          .simulate('click');
        wrapper.update();

        expect(
          wrapper.find('button[data-test-subj="dropdown-mapping-summary"]').first().exists()
        ).toBeTruthy();
        expect(
          wrapper.find('button[data-test-subj="dropdown-mapping-description"]').first().exists()
        ).toBeTruthy();
        expect(
          wrapper.find('button[data-test-subj="dropdown-mapping-not_mapped"]').first().exists()
        ).toBeTruthy();
      });

      test('it shows the correct thirdParty fields for comments', () => {
        wrapper
          .find('button[data-test-subj="case-configure-third-party-select-comments"]')
          .simulate('click');
        wrapper.update();

        expect(
          wrapper.find('button[data-test-subj="dropdown-mapping-comments"]').first().exists()
        ).toBeTruthy();
        expect(
          wrapper.find('button[data-test-subj="dropdown-mapping-not_mapped"]').first().exists()
        ).toBeTruthy();
      });
    });
  });
});
