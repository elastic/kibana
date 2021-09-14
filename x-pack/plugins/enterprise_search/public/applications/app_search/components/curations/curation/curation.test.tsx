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

import { shallow, ShallowWrapper } from 'enzyme';

import { rerender, getPageTitle, getPageHeaderActions } from '../../../../test_helpers';

jest.mock('./curation_logic', () => ({ CurationLogic: jest.fn() }));
import { CurationLogic } from './curation_logic';

import { AddResultFlyout } from './results';

import { Curation } from './';

describe('Curation', () => {
  const values = {
    dataLoading: false,
    queries: ['query A', 'query B'],
    isFlyoutOpen: false,
  };
  const actions = {
    loadCuration: jest.fn(),
    resetCuration: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    setMockValues(values);
    setMockActions(actions);
  });

  it('renders', () => {
    const wrapper = shallow(<Curation />);

    expect(getPageTitle(wrapper)).toEqual('Manage curation');
    expect(wrapper.prop('pageChrome')).toEqual([
      'Engines',
      'some-engine',
      'Curations',
      'query A, query B',
    ]);
  });

  it('renders the add result flyout when open', () => {
    setMockValues({ ...values, isFlyoutOpen: true });
    const wrapper = shallow(<Curation />);

    expect(wrapper.find(AddResultFlyout)).toHaveLength(1);
  });

  it('initializes CurationLogic with a curationId prop from URL param', () => {
    mockUseParams.mockReturnValueOnce({ curationId: 'hello-world' });
    shallow(<Curation />);

    expect(CurationLogic).toHaveBeenCalledWith({ curationId: 'hello-world' });
  });

  it('calls loadCuration on page load & whenever the curationId URL param changes', () => {
    mockUseParams.mockReturnValueOnce({ curationId: 'cur-123456789' });
    const wrapper = shallow(<Curation />);
    expect(actions.loadCuration).toHaveBeenCalledTimes(1);

    mockUseParams.mockReturnValueOnce({ curationId: 'cur-987654321' });
    rerender(wrapper);
    expect(actions.loadCuration).toHaveBeenCalledTimes(2);
  });

  describe('restore defaults button', () => {
    let restoreDefaultsButton: ShallowWrapper;
    let confirmSpy: jest.SpyInstance;

    beforeAll(() => {
      const wrapper = shallow(<Curation />);
      restoreDefaultsButton = getPageHeaderActions(wrapper).childAt(0);

      confirmSpy = jest.spyOn(window, 'confirm');
    });

    afterAll(() => {
      confirmSpy.mockRestore();
    });

    it('resets the curation upon user confirmation', () => {
      confirmSpy.mockReturnValueOnce(true);
      restoreDefaultsButton.simulate('click');
      expect(actions.resetCuration).toHaveBeenCalled();
    });

    it('does not reset the curation if the user cancels', () => {
      confirmSpy.mockReturnValueOnce(false);
      restoreDefaultsButton.simulate('click');
      expect(actions.resetCuration).not.toHaveBeenCalled();
    });
  });
});
