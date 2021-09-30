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

import { getPageHeaderActions, getPageTitle } from '../../../../test_helpers';

jest.mock('./curation_logic', () => ({ CurationLogic: jest.fn() }));

import { AppSearchPageTemplate } from '../../layout';

import { AutomatedCuration } from './automated_curation';
import { CurationLogic } from './curation_logic';

import { PromotedDocuments, OrganicDocuments } from './documents';

describe('AutomatedCuration', () => {
  const values = {
    dataLoading: false,
    queries: ['query A', 'query B'],
    isFlyoutOpen: false,
    curation: {
      suggestion: {
        status: 'applied',
      },
    },
    activeQuery: 'query A',
    isAutomated: true,
  };

  const actions = {
    convertToManual: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    setMockValues(values);
    setMockActions(actions);
    mockUseParams.mockReturnValue({ curationId: 'test' });
  });

  it('renders', () => {
    const wrapper = shallow(<AutomatedCuration />);

    expect(wrapper.is(AppSearchPageTemplate));
    expect(wrapper.find(PromotedDocuments)).toHaveLength(1);
    expect(wrapper.find(OrganicDocuments)).toHaveLength(1);
  });

  it('initializes CurationLogic with a curationId prop from URL param', () => {
    mockUseParams.mockReturnValueOnce({ curationId: 'hello-world' });
    shallow(<AutomatedCuration />);

    expect(CurationLogic).toHaveBeenCalledWith({ curationId: 'hello-world' });
  });

  it('displays the query in the title with a badge', () => {
    const wrapper = shallow(<AutomatedCuration />);
    const pageTitle = shallow(<div>{getPageTitle(wrapper)}</div>);

    expect(pageTitle.text()).toContain('query A');
    expect(pageTitle.find(EuiBadge)).toHaveLength(1);
  });

  describe('convert to manual button', () => {
    let convertToManualButton: ShallowWrapper;
    let confirmSpy: jest.SpyInstance;

    beforeAll(() => {
      const wrapper = shallow(<AutomatedCuration />);
      convertToManualButton = getPageHeaderActions(wrapper).childAt(0);

      confirmSpy = jest.spyOn(window, 'confirm');
    });

    afterAll(() => {
      confirmSpy.mockRestore();
    });

    it('converts the curation upon user confirmation', () => {
      confirmSpy.mockReturnValueOnce(true);
      convertToManualButton.simulate('click');
      expect(actions.convertToManual).toHaveBeenCalled();
    });

    it('does not convert the curation if the user cancels', () => {
      confirmSpy.mockReturnValueOnce(false);
      convertToManualButton.simulate('click');
      expect(actions.convertToManual).not.toHaveBeenCalled();
    });
  });
});
