/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockValues, setMockActions } from '../../../../../__mocks__/kea_logic';

import React from 'react';

import { shallow } from 'enzyme';

import { EuiLoadingContent, EuiEmptyPrompt } from '@elastic/eui';

import { mountWithIntl } from '../../../../../test_helpers';

import { DataPanel } from '../../../data_panel';
import { CurationResult } from '../results';

import { OrganicDocuments } from '.';

describe('OrganicDocuments', () => {
  const values = {
    curation: {
      queries: ['hello', 'world'],
      organic: [
        { id: { raw: 'mock-document-1' } },
        { id: { raw: 'mock-document-2' } },
        { id: { raw: 'mock-document-3' } },
      ],
    },
    activeQuery: 'world',
    organicDocumentsLoading: false,
    isAutomated: false,
  };
  const actions = {
    addPromotedId: jest.fn(),
    addHiddenId: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    setMockValues(values);
    setMockActions(actions);
  });

  it('renders a list of organic results', () => {
    const wrapper = shallow(<OrganicDocuments />);

    expect(wrapper.find(CurationResult)).toHaveLength(3);
  });

  it('renders the currently active query in the title', () => {
    setMockValues({ ...values, activeQuery: 'world' });
    const wrapper = shallow(<OrganicDocuments />);
    const titleText = shallow(wrapper.find(DataPanel).prop('title')).text();

    expect(titleText).toEqual('Top organic documents for "world"');
  });

  it('renders a loading state', () => {
    setMockValues({ ...values, organicDocumentsLoading: true });
    const wrapper = shallow(<OrganicDocuments />);

    expect(wrapper.find(EuiLoadingContent)).toHaveLength(1);
  });

  describe('empty state', () => {
    it('renders when organic results is empty', () => {
      setMockValues({ ...values, curation: { organic: [] } });
      const wrapper = shallow(<OrganicDocuments />);

      expect(wrapper.find(EuiEmptyPrompt)).toHaveLength(1);
    });

    it('renders when organic results is undefined', () => {
      setMockValues({ ...values, curation: { organic: undefined } });
      const wrapper = shallow(<OrganicDocuments />);

      expect(wrapper.find(EuiEmptyPrompt)).toHaveLength(1);
    });

    it('tells the user to modify the query if the curation is manual', () => {
      setMockValues({ ...values, curation: { organic: [] }, isAutomated: false });
      const wrapper = shallow(<OrganicDocuments />);
      const emptyPromptBody = mountWithIntl(<>{wrapper.find(EuiEmptyPrompt).prop('body')}</>);

      expect(emptyPromptBody.text()).toContain('Add or change');
    });
  });

  describe('actions', () => {
    it('renders results with an action button that promotes the result', () => {
      const wrapper = shallow(<OrganicDocuments />);
      const result = wrapper.find(CurationResult).first();
      result.prop('actions')[1].onClick();

      expect(actions.addPromotedId).toHaveBeenCalledWith('mock-document-1');
    });

    it('renders results with an action button that hides the result', () => {
      const wrapper = shallow(<OrganicDocuments />);
      const result = wrapper.find(CurationResult).last();
      result.prop('actions')[0].onClick();

      expect(actions.addHiddenId).toHaveBeenCalledWith('mock-document-3');
    });

    it('hides actions when the curation is automated', () => {
      setMockValues({ ...values, isAutomated: true });
      const wrapper = shallow(<OrganicDocuments />);
      const result = wrapper.find(CurationResult).first();

      expect(result.prop('actions')).toEqual([]);
    });
  });
});
