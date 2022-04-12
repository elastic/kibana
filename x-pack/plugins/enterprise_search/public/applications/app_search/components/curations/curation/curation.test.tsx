/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '../../../../__mocks__/shallow_useeffect.mock';
import { setMockActions, setMockValues } from '../../../../__mocks__/kea_logic';
import { mockUseParams } from '../../../../__mocks__/react_router';
import '../../../__mocks__/engine_logic.mock';

import React from 'react';

import { shallow } from 'enzyme';

import { EnterpriseSearchPageTemplateWrapper } from '../../../../shared/layout';
import { rerender } from '../../../../test_helpers';

jest.mock('./curation_logic', () => ({ CurationLogic: jest.fn() }));

import { AutomatedCuration } from './automated_curation';

import { ManualCuration } from './manual_curation';

import { Curation } from './';

describe('Curation', () => {
  const values = {
    dataLoading: false,
    isAutomated: true,
  };

  const actions = {
    loadCuration: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    setMockValues(values);
    setMockActions(actions);
  });

  it('calls loadCuration on page load & whenever the curationId URL param changes', () => {
    mockUseParams.mockReturnValueOnce({ curationId: 'cur-123456789' });
    const wrapper = shallow(<Curation />);
    expect(actions.loadCuration).toHaveBeenCalledTimes(1);

    mockUseParams.mockReturnValueOnce({ curationId: 'cur-987654321' });
    rerender(wrapper);
    expect(actions.loadCuration).toHaveBeenCalledTimes(2);
  });

  it('renders a loading view when loading', () => {
    setMockValues({ dataLoading: true });
    const wrapper = shallow(<Curation />);

    expect(wrapper.is(EnterpriseSearchPageTemplateWrapper)).toBe(true);
  });

  it('renders a view for automated curations', () => {
    setMockValues({ isAutomated: true });
    const wrapper = shallow(<Curation />);

    expect(wrapper.is(AutomatedCuration)).toBe(true);
  });

  it('renders a view for manual curations', () => {
    setMockValues({ isAutomated: false });
    const wrapper = shallow(<Curation />);

    expect(wrapper.is(ManualCuration)).toBe(true);
  });
});
