/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '../../../../__mocks__/shallow_useeffect.mock';
import { setMockActions } from '../../../../__mocks__/kea_logic';
import { mockUseParams } from '../../../../__mocks__/react_router';
import '../../../__mocks__/engine_logic.mock';

import React from 'react';

import { shallow, ShallowWrapper } from 'enzyme';

import { EuiButton } from '@elastic/eui';

jest.mock('./curation_logic', () => ({ CurationLogic: jest.fn() }));

import { DeleteCurationButton } from './delete_curation_button';

describe('DeleteCurationButton', () => {
  const actions = {
    deleteCuration: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    setMockActions(actions);
    mockUseParams.mockReturnValueOnce({ curationId: 'hello-world' });
  });

  it('renders', () => {
    const wrapper = shallow(<DeleteCurationButton />);

    expect(wrapper.is(EuiButton)).toBe(true);
  });

  describe('restore defaults button', () => {
    let wrapper: ShallowWrapper;
    let confirmSpy: jest.SpyInstance;

    beforeAll(() => {
      wrapper = shallow(<DeleteCurationButton />);
      confirmSpy = jest.spyOn(window, 'confirm');
    });

    afterAll(() => {
      confirmSpy.mockRestore();
    });

    it('resets the curation upon user confirmation', () => {
      confirmSpy.mockReturnValueOnce(true);
      wrapper.simulate('click');
      expect(actions.deleteCuration).toHaveBeenCalled();
    });

    it('does not reset the curation if the user cancels', () => {
      confirmSpy.mockReturnValueOnce(false);
      wrapper.simulate('click');
      expect(actions.deleteCuration).not.toHaveBeenCalled();
    });
  });
});
