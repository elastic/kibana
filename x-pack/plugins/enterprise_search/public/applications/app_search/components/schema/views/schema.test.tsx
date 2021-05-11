/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockValues, setMockActions } from '../../../../__mocks__';
import '../../../../__mocks__/shallow_useeffect.mock';

import React from 'react';

import { shallow } from 'enzyme';

import { EuiPageHeader, EuiButton } from '@elastic/eui';

import { Loading } from '../../../../shared/loading';
import { SchemaAddFieldModal } from '../../../../shared/schema';

import { SchemaCallouts, SchemaTable, EmptyState } from '../components';

import { Schema } from './';

describe('Schema', () => {
  const values = {
    dataLoading: false,
    hasSchema: true,
    isUpdating: false,
    isModalOpen: false,
  };
  const actions = {
    loadSchema: jest.fn(),
    addSchemaField: jest.fn(),
    openModal: jest.fn(),
    closeModal: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    setMockValues(values);
    setMockActions(actions);
  });

  it('renders', () => {
    const wrapper = shallow(<Schema />);

    expect(wrapper.find(SchemaCallouts)).toHaveLength(1);
    expect(wrapper.find(SchemaTable)).toHaveLength(1);
  });

  it('calls loadSchema on mount', () => {
    shallow(<Schema />);

    expect(actions.loadSchema).toHaveBeenCalled();
  });

  it('renders a loading state', () => {
    setMockValues({ ...values, dataLoading: true });
    const wrapper = shallow(<Schema />);

    expect(wrapper.find(Loading)).toHaveLength(1);
  });

  it('renders an empty state', () => {
    setMockValues({ ...values, hasSchema: false });
    const wrapper = shallow(<Schema />);

    expect(wrapper.find(EmptyState)).toHaveLength(1);
  });

  it('renders page action buttons', () => {
    const wrapper = shallow(<Schema />)
      .find(EuiPageHeader)
      .dive()
      .children()
      .dive();

    expect(wrapper.find(EuiButton)).toHaveLength(2);

    // TODO: Update button

    wrapper.find('[data-test-subj="addSchemaFieldModalButton"]').simulate('click');
    expect(actions.openModal).toHaveBeenCalled();
  });

  it('renders a schema add field modal', () => {
    setMockValues({ isModalOpen: true });
    const wrapper = shallow(<Schema />);

    expect(wrapper.find(SchemaAddFieldModal)).toHaveLength(1);
  });
});
