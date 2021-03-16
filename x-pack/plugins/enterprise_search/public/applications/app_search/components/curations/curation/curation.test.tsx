/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '../../../../__mocks__/react_router_history.mock';
import '../../../../__mocks__/shallow_useeffect.mock';
import { setMockActions, setMockValues, rerender } from '../../../../__mocks__';

import React from 'react';
import { useParams } from 'react-router-dom';

import { shallow } from 'enzyme';

import { EuiPageHeader } from '@elastic/eui';

import { SetAppSearchChrome as SetPageChrome } from '../../../../shared/kibana_chrome';
import { Loading } from '../../../../shared/loading';

jest.mock('./curation_logic', () => ({ CurationLogic: jest.fn() }));
import { CurationLogic } from './curation_logic';

import { Curation } from './';

describe('Curation', () => {
  const props = {
    curationsBreadcrumb: ['Engines', 'some-engine', 'Curations'],
  };
  const values = {
    dataLoading: false,
    curation: {
      id: 'cur-123456789',
      queries: ['query A', 'query B'],
    },
  };
  const actions = {
    loadCuration: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    setMockValues(values);
    setMockActions(actions);
  });

  it('renders', () => {
    const wrapper = shallow(<Curation {...props} />);

    expect(wrapper.find(EuiPageHeader).prop('pageTitle')).toEqual('Manage curation');
    expect(wrapper.find(SetPageChrome).prop('trail')).toEqual([
      ...props.curationsBreadcrumb,
      'query A, query B',
    ]);
  });

  it('renders a loading component on page load', () => {
    setMockValues({ ...values, dataLoading: true });
    const wrapper = shallow(<Curation {...props} />);

    expect(wrapper.find(Loading)).toHaveLength(1);
  });

  it('initializes CurationLogic with a curationId prop from URL param', () => {
    (useParams as jest.Mock).mockReturnValueOnce({ curationId: 'hello-world' });
    shallow(<Curation {...props} />);

    expect(CurationLogic).toHaveBeenCalledWith({ curationId: 'hello-world' });
  });

  it('calls loadCuration on page load & whenever the curationId URL param changes', () => {
    (useParams as jest.Mock).mockReturnValueOnce({ curationId: 'cur-123456789' });
    const wrapper = shallow(<Curation {...props} />);
    expect(actions.loadCuration).toHaveBeenCalledTimes(1);

    (useParams as jest.Mock).mockReturnValueOnce({ curationId: 'cur-987654321' });
    rerender(wrapper);
    expect(actions.loadCuration).toHaveBeenCalledTimes(2);
  });
});
