/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import '../../../__mocks__/react_router_history.mock';
import { setMockValues, setMockActions } from '../../../__mocks__/kea.mock';
import { unmountHandler } from '../../../__mocks__/shallow_useeffect.mock';

import React from 'react';
import { shallow } from 'enzyme';
import { useParams } from 'react-router-dom';
import { EuiPageContent, EuiBasicTable } from '@elastic/eui';

import { Loading } from '../../../shared/loading';
import { DocumentDetail } from '.';
import { ResultFieldValue } from '../result';

describe('DocumentDetail', () => {
  const values = {
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

    (useParams as jest.Mock).mockImplementationOnce(() => ({
      documentId: '1',
    }));
  });

  it('renders', () => {
    const wrapper = shallow(<DocumentDetail engineBreadcrumb={['test']} />);
    expect(wrapper.find(EuiPageContent).length).toBe(1);
  });

  it('initializes data on mount', () => {
    shallow(<DocumentDetail engineBreadcrumb={['test']} />);
    expect(actions.getDocumentDetails).toHaveBeenCalledWith('1');
  });

  it('calls setFields on unmount', () => {
    shallow(<DocumentDetail engineBreadcrumb={['test']} />);
    unmountHandler();
    expect(actions.setFields).toHaveBeenCalledWith([]);
  });

  it('will show a loader while data is loading', () => {
    setMockValues({
      ...values,
      dataLoading: true,
    });

    const wrapper = shallow(<DocumentDetail engineBreadcrumb={['test']} />);

    expect(wrapper.find(Loading).length).toBe(1);
  });

  describe('field values list', () => {
    let columns: any;

    const field = {
      name: 'Foo',
      value: 'Bar',
      type: 'string',
    };

    beforeEach(() => {
      const wrapper = shallow(<DocumentDetail engineBreadcrumb={['test']} />);
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
    const wrapper = shallow(<DocumentDetail engineBreadcrumb={['test']} />);
    const button = wrapper.find('[data-test-subj="DeleteDocumentButton"]');

    button.simulate('click');

    expect(actions.deleteDocument).toHaveBeenCalledWith('1');
  });

  it('correctly decodes document IDs', () => {
    (useParams as jest.Mock).mockReturnValueOnce({ documentId: 'hello%20world%20%26%3F!' });
    const wrapper = shallow(<DocumentDetail engineBreadcrumb={['test']} />);
    expect(wrapper.find('h1').text()).toEqual('Document: hello world &?!');
  });
});
