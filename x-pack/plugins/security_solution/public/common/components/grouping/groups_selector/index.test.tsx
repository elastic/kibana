/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fireEvent, render } from '@testing-library/react';
import { TestProviders } from '../../../mock';
import { GroupsSelector } from '..';
import React from 'react';

const onClearSelected = jest.fn();
const testProps = {
  fields: [
    {
      name: 'kibana.alert.rule.name',
      searchable: true,
      type: 'string',
      aggregatable: true,
      esTypes: ['keyword'],
    },
    {
      name: 'host.name',
      searchable: true,
      type: 'string',
      aggregatable: true,
      esTypes: ['keyword'],
    },
    {
      name: 'user.name',
      searchable: true,
      type: 'string',
      aggregatable: true,
      esTypes: ['keyword'],
    },
    {
      name: 'source.ip',
      searchable: true,
      type: 'ip',
      aggregatable: true,
      esTypes: ['ip'],
    },
  ],
  groupSelected: 'kibana.alert.rule.name',
  onClearSelected,
  onGroupChange: jest.fn(),
  options: [
    {
      label: 'Rule name',
      key: 'kibana.alert.rule.name',
    },
    {
      label: 'User name',
      key: 'user.name',
    },
    {
      label: 'Host name',
      key: 'host.name',
    },
    {
      label: 'Source IP',
      key: 'source.ip',
    },
  ],
  title: 'Group alerts by',
};
describe('group selector', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  it('Sets the selected group from the groupSelected prop', () => {
    const { getByTestId } = render(
      <TestProviders>
        <GroupsSelector {...testProps} />
      </TestProviders>
    );
    expect(getByTestId('group-selector-dropdown').textContent).toBe('Group alerts by: Rule name');
  });
  it('Presents correct option when group selector dropdown is clicked', () => {
    const { getByTestId } = render(
      <TestProviders>
        <GroupsSelector {...testProps} />
      </TestProviders>
    );
    fireEvent.click(getByTestId('group-selector-dropdown'));
    [
      ...testProps.options,
      { key: 'none', label: 'None' },
      { key: 'custom', label: 'Custom field' },
    ].forEach((o) => {
      expect(getByTestId(`panel-${o.key}`).textContent).toBe(o.label);
    });
  });
  it('Presents fields dropdown when custom field option is selected', () => {
    const { getByTestId } = render(
      <TestProviders>
        <GroupsSelector {...testProps} />
      </TestProviders>
    );
    fireEvent.click(getByTestId('group-selector-dropdown'));
    fireEvent.click(getByTestId('panel-none'));
    expect(onClearSelected).toHaveBeenCalled();
  });
});
