/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { ComponentType, ReactWrapper } from 'enzyme';
import { mount } from 'enzyme';

import type { FieldMappingProps } from './field_mapping';
import { FieldMapping } from './field_mapping';
import { mappings } from './__mock__';
import { TestProviders } from '../../common/mock';
import { FieldMappingRowStatic } from './field_mapping_row_static';

describe('FieldMappingRow', () => {
  let wrapper: ReactWrapper;
  const props: FieldMappingProps = {
    actionTypeName: 'ServiceNow ITSM',
    isLoading: false,
    mappings,
  };

  beforeAll(() => {
    wrapper = mount(<FieldMapping {...props} />, {
      wrappingComponent: TestProviders as ComponentType<React.PropsWithChildren<{}>>,
    });
  });

  test('it renders', () => {
    expect(
      wrapper.find('[data-test-subj="case-configure-field-mappings-row-wrapper"]').first().exists()
    ).toBe(true);

    expect(wrapper.find(FieldMappingRowStatic).length).toEqual(3);
  });

  test('it does not render without mappings', () => {
    const newWrapper = mount(<FieldMapping {...props} mappings={[]} />, {
      wrappingComponent: TestProviders as ComponentType<React.PropsWithChildren<{}>>,
    });
    expect(
      newWrapper
        .find('[data-test-subj="case-configure-field-mappings-row-wrapper"]')
        .first()
        .exists()
    ).toBe(false);
  });

  test('it pass the corrects props to mapping row', () => {
    const rows = wrapper.find(FieldMappingRowStatic);
    rows.forEach((row, index) => {
      expect(row.prop('casesField')).toEqual(mappings[index].source);
      expect(row.prop('selectedActionType')).toEqual(mappings[index].actionType);
      expect(row.prop('selectedThirdParty')).toEqual(mappings[index].target);
    });
  });

  test('displays the label of the second column correctly', () => {
    expect(
      wrapper
        .find('[data-test-subj="case-configure-field-mappings-second-col-label"]')
        .first()
        .text()
    ).toBe('ServiceNow ITSM field');
  });
});
