/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockActions, setMockValues } from '../../../../__mocks__/kea_logic';

import React from 'react';

import { shallow } from 'enzyme';

import { EuiSteps } from '@elastic/eui';

import { Status } from '../../../../../../common/types/api';

import { NewSearchIndexTemplate } from '../new_search_index_template';

import { MethodConnector } from './method_connector';

describe('MethodConnector', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setMockValues({ status: Status.IDLE });
    setMockActions({ makeRequest: jest.fn() });
  });

  it('renders connector ingestion method tab', () => {
    const wrapper = shallow(<MethodConnector isNative={false} />);
    const template = wrapper.find(NewSearchIndexTemplate);

    expect(template.prop('type')).toEqual('connector');
    expect(template.find(EuiSteps)).toHaveLength(1);
  });
});
