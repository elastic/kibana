/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '../../../../../__mocks__/shallow_useeffect.mock';
import { setMockActions, setMockValues } from '../../../../../__mocks__/kea_logic';
import { fullContentSources } from '../../../../__mocks__/content_sources.mock';

import React from 'react';

import { shallow } from 'enzyme';

import { EuiTabbedContent } from '@elastic/eui';

import { SourceLayout } from '../source_layout';

import { Frequency } from './frequency';

describe('Frequency', () => {
  const handleSelectedTabChanged = jest.fn();
  const mockActions = {
    handleSelectedTabChanged,
  };
  const mockValues = {
    contentSource: fullContentSources[0],
  };

  beforeEach(() => {
    setMockActions(mockActions);
    setMockValues(mockValues);
  });

  it('renders first tab', () => {
    const wrapper = shallow(<Frequency tabId={0} />);

    expect(wrapper.find(EuiTabbedContent)).toHaveLength(1);
    expect(wrapper.find(SourceLayout).prop('pageChrome')).toEqual(['Frequency', 'Sync frequency']);
  });

  it('renders second tab', () => {
    const wrapper = shallow(<Frequency tabId={1} />);

    expect(wrapper.find(EuiTabbedContent)).toHaveLength(1);
    expect(wrapper.find(SourceLayout).prop('pageChrome')).toEqual([
      'Frequency',
      'Blocked time windows',
    ]);
  });

  describe('tabbed content', () => {
    const tabs = [
      {
        id: 'source_sync_frequency',
        name: 'Sync frequency',
        content: <></>,
      },
      {
        id: 'blocked_time_windows',
        name: 'Blocked time windows',
        content: <></>,
      },
    ];

    it('handles first tab click', () => {
      const wrapper = shallow(<Frequency tabId={0} />);
      const tabsEl = wrapper.find(EuiTabbedContent);
      tabsEl.prop('onTabClick')!(tabs[0]);

      expect(handleSelectedTabChanged).toHaveBeenCalledWith('source_sync_frequency');
    });

    it('handles second tab click', () => {
      const wrapper = shallow(<Frequency tabId={0} />);
      const tabsEl = wrapper.find(EuiTabbedContent);
      tabsEl.prop('onTabClick')!(tabs[1]);

      expect(handleSelectedTabChanged).toHaveBeenCalledWith('blocked_time_windows');
    });
  });
});
