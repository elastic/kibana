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

import { EuiBadge } from '@elastic/eui';

import { rerender, getPageHeaderActions } from '../../../../test_helpers';

jest.mock('./curation_logic', () => ({ CurationLogic: jest.fn() }));
import { getShallowPageTitle } from '../../../../test_helpers/get_page_header';

import { AppSearchPageTemplate } from '../../layout';

import { CurationLogic } from './curation_logic';

import { PromotedDocuments, OrganicDocuments, HiddenDocuments } from './documents';
import { ActiveQuerySelect, ManageQueriesModal } from './queries';
import { AddResultFlyout } from './results';

import { Curation } from './';

describe('Curation', () => {
  const values = {
    dataLoading: false,
    queries: ['query A', 'query B'],
    isFlyoutOpen: false,
    curation: {
      suggestion: {
        status: 'applied',
      },
    },
  };

  const actions = {
    convertToManual: jest.fn(),
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

    expect(wrapper.is(AppSearchPageTemplate));
    expect(wrapper.find(PromotedDocuments)).toHaveLength(1);
    expect(wrapper.find(OrganicDocuments)).toHaveLength(1);
    expect(wrapper.find(HiddenDocuments)).toHaveLength(1);
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

  describe('manual curations', () => {
    beforeEach(() => {
      setMockValues({
        ...values,
        isAutomated: false,
      });
    });

    it('displays a static title with no badge', () => {
      const wrapper = shallow(<Curation />);
      const shallowPageTitle = getShallowPageTitle(wrapper);

      expect(shallowPageTitle.text()).toContain('Manage curation');
      expect(shallowPageTitle.find(EuiBadge)).toHaveLength(0);
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

    it('includes UX to manage queries and to select an active one', () => {
      const wrapper = shallow(<Curation />);

      expect(wrapper.find(ActiveQuerySelect)).toHaveLength(1);
      expect(wrapper.find(ManageQueriesModal)).toHaveLength(1);
    });
  });

  describe('automated curations', () => {
    beforeEach(() => {
      setMockValues({
        ...values,
        activeQuery: 'query A',
        isAutomated: true,
      });
    });

    it('displays the query in the title with a badge', () => {
      const wrapper = shallow(<Curation />);
      const shallowPageTitle = getShallowPageTitle(wrapper);

      expect(shallowPageTitle.text()).toContain('query A');
      expect(shallowPageTitle.find(EuiBadge)).toHaveLength(1);
    });

    describe('convert to manaul button', () => {
      let convertToManualButton: ShallowWrapper;
      let confirmSpy: jest.SpyInstance;

      beforeAll(() => {
        const wrapper = shallow(<Curation />);
        convertToManualButton = getPageHeaderActions(wrapper).childAt(0);

        confirmSpy = jest.spyOn(window, 'confirm');
      });

      afterAll(() => {
        confirmSpy.mockRestore();
      });

      it('resets the curation upon user confirmation', () => {
        confirmSpy.mockReturnValueOnce(true);
        convertToManualButton.simulate('click');
        expect(actions.convertToManual).toHaveBeenCalled();
      });

      it('does not reset the curation if the user cancels', () => {
        confirmSpy.mockReturnValueOnce(false);
        convertToManualButton.simulate('click');
        expect(actions.convertToManual).not.toHaveBeenCalled();
      });
    });

    it('hides the UX to manage queries and to select an active one', () => {
      const wrapper = shallow(<Curation />);

      expect(wrapper.find(ActiveQuerySelect)).toHaveLength(0);
      expect(wrapper.find(ManageQueriesModal)).toHaveLength(0);
    });
  });
});
