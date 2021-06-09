/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '../../../../__mocks__/react_router';
import '../../../../__mocks__/shallow_useeffect.mock';
import { setMockActions, setMockValues } from '../../../../__mocks__/kea_logic';

import React from 'react';
import { useLocation } from 'react-router-dom';

import { shallow } from 'enzyme';

import { Loading } from '../../../../shared/loading';

import { SourceAdded } from './source_added';

describe('SourceAdded', () => {
  const saveSourceParams = jest.fn();
  const setChromeIsVisible = jest.fn();

  beforeEach(() => {
    setMockActions({ saveSourceParams });
    setMockValues({ setChromeIsVisible });
  });

  it('renders', () => {
    const search = '?name=foo&serviceType=custom&indexPermissions=false';
    (useLocation as jest.Mock).mockImplementationOnce(() => ({ search }));
    const wrapper = shallow(<SourceAdded />);

    expect(wrapper.find(Loading)).toHaveLength(1);
    expect(saveSourceParams).toHaveBeenCalled();
    expect(setChromeIsVisible).toHaveBeenCalled();
  });
});
