/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import '../../../../__mocks__/shallow_useeffect.mock';

import { setMockActions } from '../../../../__mocks__';

import React from 'react';
import { shallow } from 'enzyme';

import { useLocation } from 'react-router-dom';

import { Loading } from '../../../../shared/loading';

import { SourceAdded } from './source_added';

describe('SourceAdded', () => {
  const saveSourceParams = jest.fn();

  beforeEach(() => {
    setMockActions({ saveSourceParams });
  });

  it('renders', () => {
    const search = '?name=foo&serviceType=custom&indexPermissions=false';
    (useLocation as jest.Mock).mockImplementationOnce(() => ({ search }));
    const wrapper = shallow(<SourceAdded />);

    expect(wrapper.find(Loading)).toHaveLength(1);
    expect(saveSourceParams).toHaveBeenCalled();
  });
});
