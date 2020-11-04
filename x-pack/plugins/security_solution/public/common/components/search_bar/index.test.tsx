/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { mount } from 'enzyme';

import { InputsModelId } from '../../store/inputs/constants';
import { SearchBarComponent } from '.';
import { TestProviders } from '../../mock';

jest.mock('../../lib/kibana');

describe('SearchBarComponent', () => {
  const props = {
    id: 'global' as InputsModelId,
    indexPattern: {
      fields: [],
      title: '',
    },
    updateSearch: jest.fn(),
    setSavedQuery: jest.fn(),
    setSearchBarFilter: jest.fn(),
    end: '',
    start: '',
    toStr: '',
    fromStr: '',
    isLoading: false,
    filterQuery: {
      query: '',
      language: '',
    },
    queries: [],
    savedQuery: undefined,
  };

  it('calls setSearchBarFilter on mount', () => {
    mount(<SearchBarComponent {...props} />, { wrappingComponent: TestProviders });

    expect(props.setSearchBarFilter).toHaveBeenCalled();
  });
});
