/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { mount, ReactWrapper } from 'enzyme';

import { TestProviders } from '../../../common/mock';
import { Mapping, MappingProps } from './mapping';
import { mappings } from './__mock__';

describe('Mapping', () => {
  let wrapper: ReactWrapper;
  const setEditFlyoutVisibility = jest.fn();
  const props: MappingProps = {
    connectorActionTypeId: '.servicenow',
    isLoading: false,
    mappings,
    setEditFlyoutVisibility,
    updateFieldMappingsDisabled: false,
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
      expect(wrapper.find('[data-test-subj="static-mappings"]').first().exists()).toBe(true);
    });

    test('correctly maps fields', () => {
      expect(wrapper.find('[data-test-subj="field-mapping-source"] code').first().text()).toBe(
        'title'
      );
      expect(wrapper.find('[data-test-subj="field-mapping-target"] code').first().text()).toBe(
        'short_description'
      );
    });

    test('it shows the update button', () => {
      expect(
        wrapper.find('[data-test-subj="case-mappings-update-connector-button"]').first().exists()
      ).toBe(true);
    });

    test('it triggers update flyout', () => {
      expect(setEditFlyoutVisibility).not.toHaveBeenCalled();
      wrapper
        .find('button[data-test-subj="case-mappings-update-connector-button"]')
        .first()
        .simulate('click');
      expect(setEditFlyoutVisibility).toHaveBeenCalled();
    });
  });
});
