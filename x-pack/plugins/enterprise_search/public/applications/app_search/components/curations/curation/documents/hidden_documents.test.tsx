/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockValues, setMockActions } from '../../../../../__mocks__/kea_logic';

import React from 'react';

import { shallow } from 'enzyme';

import { EuiEmptyPrompt, EuiButtonEmpty, EuiBadge } from '@elastic/eui';

import { DataPanel } from '../../../data_panel';
import { CurationResult } from '../results';

import { HiddenDocuments } from '.';

describe('HiddenDocuments', () => {
  const values = {
    curation: {
      hidden: [
        { id: 'mock-document-1' },
        { id: 'mock-document-2' },
        { id: 'mock-document-3' },
        { id: 'mock-document-4' },
        { id: 'mock-document-5' },
      ],
    },
    hiddenDocumentsLoading: false,
  };
  const actions = {
    removeHiddenId: jest.fn(),
    clearHiddenIds: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    setMockValues(values);
    setMockActions(actions);
  });

  it('renders a list of hidden documents', () => {
    const wrapper = shallow(<HiddenDocuments />);

    expect(wrapper.find(CurationResult)).toHaveLength(5);
  });

  it('displays the number of documents in a badge', () => {
    const wrapper = shallow(<HiddenDocuments />);
    const Icon = wrapper.prop('iconType');
    const iconWrapper = shallow(<Icon />);

    expect(iconWrapper.find(EuiBadge).prop('children')).toEqual(5);
  });

  it('renders an empty state & hides the panel actions when empty', () => {
    setMockValues({ ...values, curation: { hidden: [] } });
    const wrapper = shallow(<HiddenDocuments />);

    expect(wrapper.find(EuiEmptyPrompt)).toHaveLength(1);
    expect(wrapper.find(DataPanel).prop('action')).toBe(false);
  });

  it('renders a loading state', () => {
    setMockValues({ ...values, hiddenDocumentsLoading: true });
    const wrapper = shallow(<HiddenDocuments />);

    expect(wrapper.find(DataPanel).prop('isLoading')).toEqual(true);
  });

  describe('actions', () => {
    it('renders results with an action button that un-hides the result', () => {
      const wrapper = shallow(<HiddenDocuments />);
      const result = wrapper.find(CurationResult).last();
      result.prop('actions')[0].onClick();

      expect(actions.removeHiddenId).toHaveBeenCalledWith('mock-document-5');
    });

    it('renders a restore all button that un-hides all hidden results', () => {
      const wrapper = shallow(<HiddenDocuments />);
      const panelActions = shallow(wrapper.find(DataPanel).prop('action') as React.ReactElement);

      panelActions.find(EuiButtonEmpty).simulate('click');
      expect(actions.clearHiddenIds).toHaveBeenCalled();
    });
  });
});
