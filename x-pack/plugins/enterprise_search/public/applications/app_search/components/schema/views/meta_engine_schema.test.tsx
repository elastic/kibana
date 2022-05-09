/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockValues, setMockActions } from '../../../../__mocks__/kea_logic';
import '../../../../__mocks__/shallow_useeffect.mock';
import '../../../__mocks__/engine_logic.mock';

import React from 'react';

import { shallow } from 'enzyme';

import { EuiCallOut } from '@elastic/eui';

import { MetaEnginesSchemaTable, MetaEnginesConflictsTable } from '../components';

import { MetaEngineSchema } from '.';

describe('MetaEngineSchema', () => {
  const values = {
    dataLoading: false,
  };
  const actions = {
    loadSchema: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    setMockValues(values);
    setMockActions(actions);
  });

  it('renders', () => {
    const wrapper = shallow(<MetaEngineSchema />);

    expect(wrapper.find(MetaEnginesSchemaTable)).toHaveLength(1);
  });

  it('calls loadSchema on mount', () => {
    shallow(<MetaEngineSchema />);

    expect(actions.loadSchema).toHaveBeenCalled();
  });

  it('renders an inactive fields callout & table when source engines have schema conflicts', () => {
    setMockValues({ ...values, hasConflicts: true, conflictingFieldsCount: 5 });
    const wrapper = shallow(<MetaEngineSchema />);

    expect(wrapper.find(EuiCallOut)).toHaveLength(1);
    expect(wrapper.find(MetaEnginesConflictsTable)).toHaveLength(1);
  });
});
