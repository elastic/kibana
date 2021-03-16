/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockValues } from '../../../../../__mocks__';

import React from 'react';

import { shallow, ShallowWrapper } from 'enzyme';

import { Result } from '../../../result';

import { CurationResult } from './';

describe('CurationResult', () => {
  const values = {
    isMetaEngine: false,
    engine: { schema: 'some mock schema' },
  };

  const mockResult = {
    id: { raw: 'test' },
    _meta: { engine: 'some-engine', id: 'test' },
  };
  const mockActions = [
    { title: 'add', iconType: 'plus', onClick: () => {} },
    { title: 'remove', iconType: 'minus', onClick: () => {} },
  ];

  let wrapper: ShallowWrapper;

  beforeAll(() => {
    setMockValues(values);
    wrapper = shallow(<CurationResult result={mockResult} actions={mockActions} />);
  });

  it('passes EngineLogic state', () => {
    expect(wrapper.find(Result).prop('isMetaEngine')).toEqual(false);
    expect(wrapper.find(Result).prop('schemaForTypeHighlights')).toEqual('some mock schema');
  });

  it('passes result and actions props', () => {
    expect(wrapper.find(Result).prop('result')).toEqual(mockResult);
    expect(wrapper.find(Result).prop('actions')).toEqual(mockActions);
  });
});
