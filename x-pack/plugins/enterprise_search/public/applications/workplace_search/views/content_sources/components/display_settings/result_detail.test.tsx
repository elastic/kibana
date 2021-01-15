/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import '../../../../../__mocks__/shallow_useeffect.mock';

import { setMockValues, setMockActions } from '../../../../../__mocks__';
import { shallow, mount } from 'enzyme';

/**
 * Mocking necessary due to console warnings from react d-n-d, which EUI uses
 * https://stackoverflow.com/a/56674119/1949235
 */
jest.mock('react-beautiful-dnd', () => ({
  Droppable: ({ children }: { children: any }) =>
    children(
      {
        draggableProps: {
          style: {},
        },
        innerRef: jest.fn(),
      },
      {}
    ),
  Draggable: ({ children }: { children: any }) =>
    children(
      {
        draggableProps: {
          style: {},
        },
        innerRef: jest.fn(),
      },
      {}
    ),
  DragDropContext: ({ children }: { children: any }) => children,
}));

import React from 'react';

import { EuiTextColor } from '@elastic/eui';

import { exampleResult } from '../../../../__mocks__/content_sources.mock';

import { ExampleResultDetailCard } from './example_result_detail_card';

import { ResultDetail } from './result_detail';

describe('ResultDetail', () => {
  const { searchResultConfig, exampleDocuments } = exampleResult;
  const availableFieldOptions = [
    {
      value: 'foo',
      text: 'Foo',
    },
  ];
  const toggleFieldEditorModal = jest.fn();
  const setDetailFields = jest.fn();
  const openEditDetailField = jest.fn();
  const removeDetailField = jest.fn();

  beforeEach(() => {
    setMockActions({
      toggleFieldEditorModal,
      setDetailFields,
      openEditDetailField,
      removeDetailField,
    });
    setMockValues({
      searchResultConfig,
      availableFieldOptions,
      exampleDocuments,
    });
  });

  it('renders', () => {
    const wrapper = shallow(<ResultDetail />);

    expect(wrapper.find(ExampleResultDetailCard)).toHaveLength(1);
  });

  it('calls setTitleField on change', () => {
    const wrapper = shallow(<ResultDetail />);
    wrapper.find('[data-test-subj="AddFieldButton"]').simulate('click');

    expect(toggleFieldEditorModal).toHaveBeenCalled();
  });

  it('handles empty detailFields', () => {
    setMockValues({
      searchResultConfig: {
        ...searchResultConfig,
        detailFields: [],
      },
      availableFieldOptions,
      exampleDocuments,
    });
    const wrapper = shallow(<ResultDetail />);

    expect(wrapper.find('[data-test-subj="EmptyFieldsDescription"]')).toHaveLength(1);
  });

  it('handles drag and drop', () => {
    const wrapper = mount(<ResultDetail />);
    wrapper.find('[data-test-subj="EditFieldButton"]').first().simulate('click');
    wrapper.find('[data-test-subj="RemoveFieldButton"]').first().simulate('click');

    expect(openEditDetailField).toHaveBeenCalled();
    expect(removeDetailField).toHaveBeenCalled();
    expect(wrapper.find(EuiTextColor).first().text()).toEqual('“Felines”');
  });

  it('handles empty label fallback', () => {
    setMockValues({
      searchResultConfig: {
        ...searchResultConfig,
        detailFields: [
          {
            fieldName: 'foo',
          },
        ],
      },
      availableFieldOptions,
      exampleDocuments,
    });
    const wrapper = mount(<ResultDetail />);

    expect(wrapper.find(EuiTextColor).first().text()).toEqual('“”');
  });
});
