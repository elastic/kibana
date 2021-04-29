/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { shallow, mount } from 'enzyme';
import React from 'react';
import { keys } from 'lodash';
import {
  ConditionEntry,
  ConditionEntryField,
  OperatingSystem,
} from '../../../../../../../common/endpoint/types';

import { ConditionEntryInput } from '.';
import { EuiSuperSelectProps } from '@elastic/eui';

let onRemoveMock: jest.Mock;
let onChangeMock: jest.Mock;
let onVisitedMock: jest.Mock;

const entry: Readonly<ConditionEntry> = {
  field: ConditionEntryField.HASH,
  type: 'match',
  operator: 'included',
  value: 'trustedApp',
};

describe('Condition entry input', () => {
  beforeEach(() => {
    onRemoveMock = jest.fn();
    onChangeMock = jest.fn();
    onVisitedMock = jest.fn();
  });

  const getElement = (
    subject: string,
    os: OperatingSystem = OperatingSystem.WINDOWS,
    isRemoveDisabled: boolean = false
  ) => (
    <ConditionEntryInput
      os={os}
      entry={entry}
      showLabels
      onRemove={onRemoveMock}
      onChange={onChangeMock}
      onVisited={onVisitedMock}
      data-test-subj={subject}
      isRemoveDisabled={isRemoveDisabled}
    />
  );

  it.each(keys(ConditionEntryField).map((k) => [k]))(
    'should call on change for field input with value %s',
    (field) => {
      const element = shallow(getElement('testOnChange'));
      expect(onChangeMock).toHaveBeenCalledTimes(0);
      element
        .find('[data-test-subj="testOnChange-field"]')
        .first()
        .simulate('change', { target: { value: field } });
      expect(onChangeMock).toHaveBeenCalledTimes(1);
      expect(onChangeMock).toHaveBeenCalledWith(
        {
          ...entry,
          field: { target: { value: field } },
        },
        entry
      );
    }
  );

  it('should call on remove for field input', () => {
    const element = mount(getElement('testOnRemove'));
    expect(onRemoveMock).toHaveBeenCalledTimes(0);
    element.find('[data-test-subj="testOnRemove-remove"]').first().simulate('click');
    expect(onRemoveMock).toHaveBeenCalledTimes(1);
    expect(onRemoveMock).toHaveBeenCalledWith(entry);
  });

  it('should not be able to call on remove for field input because disabled', () => {
    const element = mount(getElement('testOnRemove', OperatingSystem.WINDOWS, true));
    expect(onRemoveMock).toHaveBeenCalledTimes(0);
    element.find('[data-test-subj="testOnRemove-remove"]').first().simulate('click');
    expect(onRemoveMock).toHaveBeenCalledTimes(0);
  });

  it('should call on visited for field input', () => {
    const element = shallow(getElement('testOnVisited'));
    expect(onVisitedMock).toHaveBeenCalledTimes(0);
    element.find('[data-test-subj="testOnVisited-value"]').first().simulate('blur');
    expect(onVisitedMock).toHaveBeenCalledTimes(1);
    expect(onVisitedMock).toHaveBeenCalledWith(entry);
  });

  it('should change value for field input', () => {
    const element = shallow(getElement('testOnChange'));
    expect(onChangeMock).toHaveBeenCalledTimes(0);
    element
      .find('[data-test-subj="testOnChange-value"]')
      .first()
      .simulate('change', { target: { value: 'new value' } });
    expect(onChangeMock).toHaveBeenCalledTimes(1);
    expect(onChangeMock).toHaveBeenCalledWith(
      {
        ...entry,
        value: 'new value',
      },
      entry
    );
  });

  it('should be able to select three options when WINDOWS OS', () => {
    const element = mount(getElement('testCheckSignatureOption'));
    const superSelectProps = element
      .find('[data-test-subj="testCheckSignatureOption-field"]')
      .first()
      .props() as EuiSuperSelectProps<string>;
    expect(superSelectProps.options.length).toBe(3);
  });

  it('should be able to select two options when LINUX OS', () => {
    const element = mount(getElement('testCheckSignatureOption', OperatingSystem.LINUX));
    const superSelectProps = element
      .find('[data-test-subj="testCheckSignatureOption-field"]')
      .first()
      .props() as EuiSuperSelectProps<string>;
    expect(superSelectProps.options.length).toBe(2);
  });

  it('should be able to select two options when MAC OS', () => {
    const element = mount(getElement('testCheckSignatureOption', OperatingSystem.MAC));
    const superSelectProps = element
      .find('[data-test-subj="testCheckSignatureOption-field"]')
      .first()
      .props() as EuiSuperSelectProps<string>;
    expect(superSelectProps.options.length).toBe(2);
  });
});
