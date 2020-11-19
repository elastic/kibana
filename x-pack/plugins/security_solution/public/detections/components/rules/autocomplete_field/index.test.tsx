/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { mount } from 'enzyme';

import { AutocompleteField } from './';
import { useFormFieldMock } from '../../../../common/mock';
import { mockBrowserFields } from '../../../../common/containers/source/mock';
import { FieldHook } from '../../../../shared_imports';

jest.mock('../../../../common/lib/kibana');

describe('AutocompleteField', () => {
  let field: FieldHook;

  beforeEach(() => {
    field = { ...useFormFieldMock(), value: 'agent.hostname' };
  });

  it('renders component', () => {
    const Component = () => {
      return (
        <AutocompleteField
          browserFields={mockBrowserFields}
          dataTestSubj="fieldTest"
          field={field}
          isDisabled={false}
          showOptional={false}
        />
      );
    };
    const wrapper = mount(<Component />);

    expect(wrapper.find('[data-test-subj="fieldAutocompleteOptionalLabel"]').exists()).toBeFalsy();
    expect(wrapper.find('[data-test-subj="fieldTest"] input').first().prop('disabled')).toBeFalsy();
    expect(wrapper.find('[data-test-subj="fieldAutocompleteResetButton"]').exists()).toBeFalsy();
  });

  it('renders optional label if "showOptional" is true', () => {
    const Component = () => {
      return (
        <AutocompleteField
          browserFields={mockBrowserFields}
          dataTestSubj="fieldTest"
          field={field}
          isDisabled={false}
          showOptional
        />
      );
    };
    const wrapper = mount(<Component />);

    expect(wrapper.find('[data-test-subj="fieldAutocompleteOptionalLabel"]').exists()).toBeTruthy();
  });

  it('renders disabled if "isDisabled" is true', () => {
    const Component = () => {
      return (
        <AutocompleteField
          browserFields={mockBrowserFields}
          dataTestSubj="fieldTest"
          field={field}
          isDisabled
          showOptional={false}
        />
      );
    };
    const wrapper = mount(<Component />);

    expect(
      wrapper.find('[data-test-subj="fieldTest"] input').first().prop('disabled')
    ).toBeTruthy();
  });

  it('renders reset button if field passed in does not exist as an option', () => {
    const fieldWithBadValue = useFormFieldMock();
    const Component = () => {
      return (
        <AutocompleteField
          browserFields={mockBrowserFields}
          dataTestSubj="fieldTest"
          field={fieldWithBadValue}
          isDisabled
          showOptional={false}
        />
      );
    };
    const wrapper = mount(<Component />);

    expect(wrapper.find('[data-test-subj="fieldAutocompleteResetButton"]').exists()).toBeTruthy();
  });

  it('resets field when reset button clicked', () => {
    const fieldWithBadValue = useFormFieldMock();
    const Component = () => {
      return (
        <AutocompleteField
          browserFields={mockBrowserFields}
          dataTestSubj="fieldTest"
          field={fieldWithBadValue}
          isDisabled
          showOptional={false}
        />
      );
    };
    const wrapper = mount(<Component />);

    wrapper.find('[data-test-subj="fieldAutocompleteResetButton"] button').at(0).simulate('click');

    expect(fieldWithBadValue.setValue).toHaveBeenCalledWith('');
  });
});
