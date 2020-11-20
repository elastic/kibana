/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { mount, ReactWrapper } from 'enzyme';

import { FieldMapping, FieldMappingProps } from './field_mapping';
import { mappings } from './__mock__';
import { FieldMappingRow } from './field_mapping_row';
import { TestProviders } from '../../../common/mock';

describe('FieldMappingRow', () => {
  let wrapper: ReactWrapper;
  const props: FieldMappingProps = {
    isLoading: false,
    mappings,
    connectorActionTypeId: '.servicenow',
  };

  beforeAll(() => {
    wrapper = mount(<FieldMapping {...props} />, { wrappingComponent: TestProviders });
  });

  test('it renders', () => {
    expect(
      wrapper.find('[data-test-subj="case-configure-field-mapping-cols"]').first().exists()
    ).toBe(true);

    expect(
      wrapper.find('[data-test-subj="case-configure-field-mapping-row-wrapper"]').first().exists()
    ).toBe(true);

    expect(wrapper.find(FieldMappingRow).length).toEqual(3);
  });

  test('it shows the correct number of FieldMappingRow with default mapping', () => {
    const newWrapper = mount(<FieldMapping {...props} mappings={[]} />, {
      wrappingComponent: TestProviders,
    });

    expect(newWrapper.find(FieldMappingRow).length).toEqual(3);
  });

  test('it pass the corrects props to mapping row', () => {
    const rows = wrapper.find(FieldMappingRow);
    rows.forEach((row, index) => {
      expect(row.prop('securitySolutionField')).toEqual(mappings[index].source);
      expect(row.prop('selectedActionType')).toEqual(mappings[index].actionType);
      expect(row.prop('selectedThirdParty')).toEqual(mappings[index].target);
    });
  });

  test('it should show zero rows on empty array', () => {
    const newWrapper = mount(<FieldMapping {...props} mappings={[]} />, {
      wrappingComponent: TestProviders,
    });

    expect(newWrapper.find(FieldMappingRow).length).toEqual(0);
  });
});
