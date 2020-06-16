/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { mount, ReactWrapper } from 'enzyme';
import { EuiSuperSelectOption, EuiSuperSelect } from '@elastic/eui';

import { FieldMappingRow, RowProps } from './field_mapping_row';
import { TestProviders } from '../../../common/mock';
import { ThirdPartyField, ActionType } from '../../containers/configure/types';

const thirdPartyOptions: Array<EuiSuperSelectOption<ThirdPartyField>> = [
  {
    value: 'short_description',
    inputDisplay: <span>{'Short Description'}</span>,
    'data-test-subj': 'third-party-short-desc',
  },
  {
    value: 'description',
    inputDisplay: <span>{'Description'}</span>,
    'data-test-subj': 'third-party-desc',
  },
];

const actionTypeOptions: Array<EuiSuperSelectOption<ActionType>> = [
  {
    value: 'nothing',
    inputDisplay: <>{'Nothing'}</>,
    'data-test-subj': 'edit-update-option-nothing',
  },
  {
    value: 'overwrite',
    inputDisplay: <>{'Overwrite'}</>,
    'data-test-subj': 'edit-update-option-overwrite',
  },
  {
    value: 'append',
    inputDisplay: <>{'Append'}</>,
    'data-test-subj': 'edit-update-option-append',
  },
];

describe('FieldMappingRow', () => {
  let wrapper: ReactWrapper;
  const onChangeActionType = jest.fn();
  const onChangeThirdParty = jest.fn();

  const props: RowProps = {
    id: 'title',
    disabled: false,
    securitySolutionField: 'title',
    thirdPartyOptions,
    actionTypeOptions,
    onChangeActionType,
    onChangeThirdParty,
    selectedActionType: 'nothing',
    selectedThirdParty: 'short_description',
  };

  beforeAll(() => {
    wrapper = mount(<FieldMappingRow {...props} />, { wrappingComponent: TestProviders });
  });

  test('it renders', () => {
    expect(
      wrapper.find('[data-test-subj="case-configure-third-party-select-title"]').first().exists()
    ).toBe(true);

    expect(
      wrapper.find('[data-test-subj="case-configure-action-type-select-title"]').first().exists()
    ).toBe(true);
  });

  test('it passes thirdPartyOptions correctly', () => {
    const selectProps = wrapper.find(EuiSuperSelect).first().props();

    expect(selectProps.options).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          value: 'short_description',
          'data-test-subj': 'third-party-short-desc',
        }),
        expect.objectContaining({
          value: 'description',
          'data-test-subj': 'third-party-desc',
        }),
      ])
    );
  });

  test('it passes the correct actionTypeOptions', () => {
    const selectProps = wrapper.find(EuiSuperSelect).at(1).props();

    expect(selectProps.options).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          value: 'nothing',
          'data-test-subj': 'edit-update-option-nothing',
        }),
        expect.objectContaining({
          value: 'overwrite',
          'data-test-subj': 'edit-update-option-overwrite',
        }),
        expect.objectContaining({
          value: 'append',
          'data-test-subj': 'edit-update-option-append',
        }),
      ])
    );
  });
});
