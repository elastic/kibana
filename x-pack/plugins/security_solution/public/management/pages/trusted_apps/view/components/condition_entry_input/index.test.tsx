/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { shallow, mount } from 'enzyme';
import React from 'react';
import { keys } from 'lodash';
import { ConditionEntryField, OperatingSystem } from '@kbn/securitysolution-utils';
import { TrustedAppConditionEntry } from '../../../../../../../common/endpoint/types';

import { ConditionEntryInput } from '.';
import { EuiSuperSelectProps } from '@elastic/eui';

let onRemoveMock: jest.Mock;
let onChangeMock: jest.Mock;
let onVisitedMock: jest.Mock;

const baseEntry: Readonly<TrustedAppConditionEntry> = {
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
    isRemoveDisabled: boolean = false,
    entry: TrustedAppConditionEntry = baseEntry
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

  // @ts-ignore
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
          ...baseEntry,
          field: { target: { value: field } },
        },
        baseEntry
      );
    }
  );

  it('should call on remove for field input', () => {
    const element = mount(getElement('testOnRemove'));
    expect(onRemoveMock).toHaveBeenCalledTimes(0);
    element.find('[data-test-subj="testOnRemove-remove"]').first().simulate('click');
    expect(onRemoveMock).toHaveBeenCalledTimes(1);
    expect(onRemoveMock).toHaveBeenCalledWith(baseEntry);
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
    expect(onVisitedMock).toHaveBeenCalledWith(baseEntry);
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
        ...baseEntry,
        value: 'new value',
      },
      baseEntry
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

  it('should have operator value selected when field is HASH', () => {
    const element = shallow(getElement('testOperatorOptions'));
    const inputField = element.find('[data-test-subj="testOperatorOptions-operator"]');
    expect(inputField.contains('is'));
  });

  it('should show operator dorpdown with two values when field is PATH', () => {
    const element = shallow(
      getElement('testOperatorOptions', undefined, undefined, {
        ...baseEntry,
        field: ConditionEntryField.PATH,
      })
    );
    const superSelectProps = element
      .find('[data-test-subj="testOperatorOptions-operator"]')
      .first()
      .props() as EuiSuperSelectProps<string>;
    expect(superSelectProps.options.length).toBe(2);
  });
});
