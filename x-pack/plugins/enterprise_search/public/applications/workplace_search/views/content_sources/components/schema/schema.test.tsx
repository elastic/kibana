/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '../../../../../__mocks__/shallow_useeffect.mock';

import { setMockValues, setMockActions } from '../../../../../__mocks__/kea_logic';
import { mostRecentIndexJob } from '../../../../__mocks__/content_sources.mock';

import React from 'react';

import { shallow } from 'enzyme';

import { EuiEmptyPrompt, EuiFieldSearch } from '@elastic/eui';

import { Loading } from '../../../../../shared/loading';
import { SchemaAddFieldModal, SchemaErrorsCallout } from '../../../../../shared/schema';

import { Schema } from './schema';
import { SchemaFieldsTable } from './schema_fields_table';

describe('Schema', () => {
  const initializeSchema = jest.fn();
  const addNewField = jest.fn();
  const updateFields = jest.fn();
  const openAddFieldModal = jest.fn();
  const closeAddFieldModal = jest.fn();
  const setFilterValue = jest.fn();

  const sourceId = '123';
  const activeSchema = {
    foo: 'string',
  };
  const filterValue = '';
  const showAddFieldModal = false;
  const addFieldFormErrors = null;
  const formUnchanged = true;
  const dataLoading = false;
  const isOrganization = true;

  const mockValues = {
    sourceId,
    activeSchema,
    filterValue,
    showAddFieldModal,
    addFieldFormErrors,
    mostRecentIndexJob: {},
    formUnchanged,
    dataLoading,
    isOrganization,
  };

  beforeEach(() => {
    setMockValues({ ...mockValues });
    setMockActions({
      initializeSchema,
      addNewField,
      updateFields,
      openAddFieldModal,
      closeAddFieldModal,
      setFilterValue,
    });
  });

  it('renders', () => {
    const wrapper = shallow(<Schema />);

    expect(wrapper.find(SchemaFieldsTable)).toHaveLength(1);
  });

  it('returns loading when loading', () => {
    setMockValues({ ...mockValues, dataLoading: true });
    const wrapper = shallow(<Schema />);

    expect(wrapper.find(Loading)).toHaveLength(1);
  });

  it('handles empty state', () => {
    setMockValues({ ...mockValues, activeSchema: {} });
    const wrapper = shallow(<Schema />);

    expect(wrapper.find(EuiEmptyPrompt)).toHaveLength(1);
  });

  it('renders modal', () => {
    setMockValues({ ...mockValues, showAddFieldModal: true });
    const wrapper = shallow(<Schema />);

    expect(wrapper.find(SchemaAddFieldModal)).toHaveLength(1);
  });

  it('gets search results when filters changed', () => {
    const wrapper = shallow(<Schema />);
    const input = wrapper.find(EuiFieldSearch);
    input.simulate('change', { target: { value: 'Query' } });

    expect(setFilterValue).toHaveBeenCalledWith('Query');
  });

  it('renders schema errors', () => {
    setMockValues({ ...mockValues, mostRecentIndexJob });
    const wrapper = shallow(<Schema />);

    expect(wrapper.find(SchemaErrorsCallout)).toHaveLength(1);
    expect(wrapper.find(SchemaErrorsCallout).prop('viewErrorsPath')).toEqual(
      '/sources/123/schema_errors/123'
    );
  });
});
