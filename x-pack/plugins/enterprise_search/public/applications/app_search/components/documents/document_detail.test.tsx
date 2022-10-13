/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockValues, setMockActions } from '../../../__mocks__/kea_logic';
import { mockUseParams } from '../../../__mocks__/react_router';
import { unmountHandler } from '../../../__mocks__/shallow_useeffect.mock';
import '../../__mocks__/engine_logic.mock';

import React from 'react';

import { shallow } from 'enzyme';

import { EuiPanel, EuiBasicTable } from '@elastic/eui';

import { getPageHeaderActions } from '../../../test_helpers';

import { ResultFieldValue } from '../result';

import { DocumentDetail } from '.';

describe('DocumentDetail', () => {
  const values = {
    isMetaEngine: false,
    isElasticsearchEngine: false,
    dataLoading: false,
    fields: [],
  };

  const actions = {
    deleteDocument: jest.fn(),
    getDocumentDetails: jest.fn(),
    setFields: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    setMockValues(values);
    setMockActions(actions);

    mockUseParams.mockImplementationOnce(() => ({
      documentId: '1',
    }));
  });

  it('renders', () => {
    const wrapper = shallow(<DocumentDetail />);
    expect(wrapper.find(EuiPanel).length).toBe(1);
  });

  it('initializes data on mount', () => {
    shallow(<DocumentDetail />);
    expect(actions.getDocumentDetails).toHaveBeenCalledWith('1');
  });

  it('calls setFields on unmount', () => {
    shallow(<DocumentDetail />);
    unmountHandler();
    expect(actions.setFields).toHaveBeenCalledWith([]);
  });

  describe('field values list', () => {
    let columns: any;

    const field = {
      name: 'Foo',
      value: 'Bar',
      type: 'string',
    };

    beforeEach(() => {
      const wrapper = shallow(<DocumentDetail />);
      columns = wrapper.find(EuiBasicTable).props().columns;
    });

    it('will render the field name in the first column', () => {
      const column = columns[0];
      const wrapper = shallow(<div>{column.render(field)}</div>);
      expect(wrapper.text()).toEqual('Foo');
    });

    it('will render the field value in the second column', () => {
      const column = columns[1];
      const wrapper = shallow(<div>{column.render(field)}</div>);
      expect(wrapper.find(ResultFieldValue).props()).toEqual({
        raw: 'Bar',
        type: 'string',
      });
    });
  });

  it('will delete the document when the delete button is pressed', () => {
    const wrapper = shallow(<DocumentDetail />);
    const button = getPageHeaderActions(wrapper).find('[data-test-subj="DeleteDocumentButton"]');

    button.simulate('click');

    expect(actions.deleteDocument).toHaveBeenCalledWith('1');
  });

  it('hides delete button when the document is a part of a meta engine', () => {
    setMockValues({ ...values, isMetaEngine: true });
    const wrapper = shallow(<DocumentDetail />);

    expect(
      getPageHeaderActions(wrapper).find('[data-test-subj="DeleteDocumentButton"]')
    ).toHaveLength(0);
  });

  it('hides delete button when the document is a part of an elasticsearch-indexed engine', () => {
    setMockValues({ ...values, isElasticsearchEngine: true });
    const wrapper = shallow(<DocumentDetail />);

    expect(
      getPageHeaderActions(wrapper).find('[data-test-subj="DeleteDocumentButton"]')
    ).toHaveLength(0);
  });
});
