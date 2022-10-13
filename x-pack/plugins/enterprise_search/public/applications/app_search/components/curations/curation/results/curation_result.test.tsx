/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockValues } from '../../../../../__mocks__/kea_logic';

import React from 'react';
import { DraggableProvidedDragHandleProps } from 'react-beautiful-dnd';

import { shallow, ShallowWrapper } from 'enzyme';

import { Result } from '../../../result';

import { CurationResult } from '.';

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
  const mockDragging = {} as DraggableProvidedDragHandleProps; // Passed from EuiDraggable

  let wrapper: ShallowWrapper;

  beforeAll(() => {
    setMockValues(values);
    wrapper = shallow(
      <CurationResult result={mockResult} actions={mockActions} dragHandleProps={mockDragging} />
    );
  });

  it('passes EngineLogic state', () => {
    expect(wrapper.find(Result).prop('isMetaEngine')).toEqual(false);
    expect(wrapper.find(Result).prop('schemaForTypeHighlights')).toEqual('some mock schema');
  });

  it('passes result, actions, and dragHandleProps props', () => {
    expect(wrapper.find(Result).prop('result')).toEqual(mockResult);
    expect(wrapper.find(Result).prop('actions')).toEqual(mockActions);
    expect(wrapper.find(Result).prop('dragHandleProps')).toEqual(mockDragging);
  });

  it('increments the result index before passing it on', () => {
    wrapper = shallow(
      <CurationResult
        result={mockResult}
        index={5}
        actions={mockActions}
        dragHandleProps={mockDragging}
      />
    );
    expect(wrapper.find(Result).prop('resultPosition')).toEqual(6);
  });
});
