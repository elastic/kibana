/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act } from 'react-dom/test-utils';
import { shallow, mount } from 'enzyme';
import { EuiComboBox } from '@elastic/eui';
import { IncludeExcludeRow } from './include_exclude_options';

const tableRows = [
  {
    '1': 'ABC',
    '2': 'test',
  },
  {
    '1': 'FEF',
    '2': 'test',
  },
];

describe('IncludeExcludeComponent', () => {
  it('should render 2 EuiComboBox component correctly', () => {
    const instance = shallow(
      <IncludeExcludeRow include={[]} exclude={[]} updateParams={jest.fn()} columnId="1" />
    );

    expect(instance.find(EuiComboBox).length).toEqual(2);
  });

  it('should run updateParams function on update', () => {
    const onUpdateSpy = jest.fn();
    const instance = shallow(
      <IncludeExcludeRow
        include={undefined}
        exclude={undefined}
        updateParams={onUpdateSpy}
        columnId="1"
        tableRows={tableRows}
      />
    );
    act(() => {
      instance.find(EuiComboBox).first().prop('onChange')!([{ label: 'ABC' }]);
    });
    expect(
      instance.find('[data-test-subj="lens-include-terms-combobox"]').prop('selectedOptions')
    ).toEqual([{ label: 'ABC' }]);
    expect(onUpdateSpy.mock.calls.length).toBe(1);
  });

  it('should run updateParams function onCreateOption', () => {
    const onUpdateSpy = jest.fn();
    const instance = shallow(
      <IncludeExcludeRow
        include={undefined}
        exclude={undefined}
        updateParams={onUpdateSpy}
        columnId="1"
        tableRows={tableRows}
      />
    );
    act(() => {
      instance.find(EuiComboBox).first().prop('onCreateOption')!('test.*', [{ label: 'ABC' }]);
    });
    expect(
      instance.find('[data-test-subj="lens-include-terms-combobox"]').prop('selectedOptions')
    ).toEqual([{ label: 'test.*' }]);
    expect(onUpdateSpy.mock.calls.length).toBe(1);
  });

  it('should initialize the selected options correctly if include prop is given', () => {
    const onUpdateSpy = jest.fn();
    const instance = shallow(
      <IncludeExcludeRow
        include={['FEF']}
        exclude={undefined}
        updateParams={onUpdateSpy}
        columnId="1"
        tableRows={tableRows}
      />
    );
    expect(
      instance.find('[data-test-subj="lens-include-terms-combobox"]').prop('selectedOptions')
    ).toEqual([{ label: 'FEF' }]);
  });

  it('should initialize the selected options correctly if exclude prop is given', () => {
    const onUpdateSpy = jest.fn();
    const instance = shallow(
      <IncludeExcludeRow
        include={['FEF']}
        exclude={['ABC']}
        updateParams={onUpdateSpy}
        columnId="1"
        tableRows={tableRows}
      />
    );
    expect(
      instance.find('[data-test-subj="lens-exclude-terms-combobox"]').prop('selectedOptions')
    ).toEqual([{ label: 'ABC' }]);
  });

  it('should initialize the options correctly', () => {
    const onUpdateSpy = jest.fn();
    const instance = mount(
      <IncludeExcludeRow
        include={undefined}
        exclude={undefined}
        updateParams={onUpdateSpy}
        columnId="1"
        tableRows={tableRows}
      />
    );
    expect(
      instance.find('[data-test-subj="lens-include-terms-combobox"]').first().prop('options')
    ).toEqual([{ label: 'ABC' }, { label: 'FEF' }]);
  });

  it('should run as single selection if pattern is given', () => {
    const onUpdateSpy = jest.fn();
    const instance = shallow(
      <IncludeExcludeRow
        include={undefined}
        exclude={undefined}
        updateParams={onUpdateSpy}
        columnId="1"
        tableRows={tableRows}
      />
    );
    act(() => {
      instance.find(EuiComboBox).first().prop('onCreateOption')!('test.*', [{ label: 'ABC' }]);
    });
    expect(
      instance.find('[data-test-subj="lens-include-terms-combobox"]').prop('singleSelection')
    ).toBe(true);
  });

  it('should run as multi selection if normal string is given', () => {
    const onUpdateSpy = jest.fn();
    const instance = shallow(
      <IncludeExcludeRow
        include={undefined}
        exclude={undefined}
        updateParams={onUpdateSpy}
        columnId="1"
        tableRows={tableRows}
      />
    );
    act(() => {
      instance.find(EuiComboBox).first().prop('onCreateOption')!('test', [{ label: 'ABC' }]);
    });
    expect(
      instance.find('[data-test-subj="lens-include-terms-combobox"]').prop('singleSelection')
    ).toBe(false);
  });
});
