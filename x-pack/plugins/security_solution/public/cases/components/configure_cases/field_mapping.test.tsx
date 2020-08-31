/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { mount, ReactWrapper } from 'enzyme';

import { connectorsConfiguration } from '../../../common/lib/connectors/config';
import { createDefaultMapping } from '../../../common/lib/connectors/utils';

import { FieldMapping, FieldMappingProps } from './field_mapping';
import { mapping } from './__mock__';
import { FieldMappingRow } from './field_mapping_row';
import { TestProviders } from '../../../common/mock';

describe('FieldMappingRow', () => {
  let wrapper: ReactWrapper;
  const onChangeMapping = jest.fn();
  const props: FieldMappingProps = {
    disabled: false,
    mapping,
    onChangeMapping,
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
    const newWrapper = mount(<FieldMapping {...props} mapping={null} />, {
      wrappingComponent: TestProviders,
    });

    expect(newWrapper.find(FieldMappingRow).length).toEqual(3);
  });

  test('it pass the corrects props to mapping row', () => {
    const rows = wrapper.find(FieldMappingRow);
    rows.forEach((row, index) => {
      expect(row.prop('securitySolutionField')).toEqual(mapping[index].source);
      expect(row.prop('selectedActionType')).toEqual(mapping[index].actionType);
      expect(row.prop('selectedThirdParty')).toEqual(mapping[index].target);
    });
  });

  test('it pass the default mapping when mapping is null', () => {
    const newWrapper = mount(<FieldMapping {...props} mapping={null} />, {
      wrappingComponent: TestProviders,
    });

    const selectedConnector = connectorsConfiguration['.servicenow'];
    const defaultMapping = createDefaultMapping(selectedConnector.fields);

    const rows = newWrapper.find(FieldMappingRow);
    rows.forEach((row, index) => {
      expect(row.prop('securitySolutionField')).toEqual(defaultMapping[index].source);
      expect(row.prop('selectedActionType')).toEqual(defaultMapping[index].actionType);
      expect(row.prop('selectedThirdParty')).toEqual(defaultMapping[index].target);
    });
  });

  test('it should show zero rows on empty array', () => {
    const newWrapper = mount(<FieldMapping {...props} mapping={[]} />, {
      wrappingComponent: TestProviders,
    });

    expect(newWrapper.find(FieldMappingRow).length).toEqual(0);
  });
});
