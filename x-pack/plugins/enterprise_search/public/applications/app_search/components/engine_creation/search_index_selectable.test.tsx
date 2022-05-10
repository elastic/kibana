/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '../../../__mocks__/shallow_useeffect.mock';
import { setMockActions, setMockValues } from '../../../__mocks__/kea_logic';

import React from 'react';

import { shallow, mount } from 'enzyme';

import { EuiSelectable, EuiIcon, EuiHighlight } from '@elastic/eui';

import { SearchIndexSelectable, SearchIndexSelectableOption } from './search_index_selectable';

describe('SearchIndexSelectable', () => {
  const DEFAULT_VALUES = {
    isIndicesLoading: false,
    indicesFormatted: [
      {
        label: 'search-test-index-1',
        health: 'green',
        status: 'open',
        total: {
          docs: {
            count: 100,
            deleted: 0,
          },
          store: {
            size_in_bytes: '108Kb',
          },
        },
      },
      {
        label: 'search-test-index-2',
        health: 'green',
        status: 'open',
        total: {
          docs: {
            count: 100,
            deleted: 0,
          },
          store: {
            size_in_bytes: '108Kb',
          },
        },
        checked: 'on',
      },
    ],
  };
  const MOCK_ACTIONS = { loadIndices: jest.fn(), setSelectedIndex: jest.fn() };
  beforeEach(() => {
    jest.clearAllMocks();
    setMockValues(DEFAULT_VALUES);
    setMockActions(MOCK_ACTIONS);
  });

  it('renders', () => {
    const wrapper = shallow(<SearchIndexSelectable />);
    const selectable = wrapper.find(EuiSelectable);
    expect(wrapper.find('[data-test-subj="SearchIndexSelectable"]')).toHaveLength(1);
    expect(selectable.prop('emptyMessage')).toEqual('No Elasticsearch indices available');
    expect(selectable.prop('loadingMessage')).toEqual('Loading Elasticsearch indices');
  });

  it('renders custom options', () => {
    const wrapper = shallow(<SearchIndexSelectable />);
    const selectable = wrapper.find(EuiSelectable);
    const customOptions = selectable.prop('renderOption')!;
    const renderedOptions = mount(
      <>
        {customOptions(
          DEFAULT_VALUES.indicesFormatted[0] as SearchIndexSelectableOption,
          'search-'
        )}
      </>
    );

    expect(renderedOptions.find(EuiHighlight).text()).toEqual('search-test-index-1');
    expect(renderedOptions.find(EuiIcon).prop('color')).toEqual('success');
    expect(renderedOptions.find('[data-test-subj="optionStatus"]').text()).toEqual(
      'Status:\u00a0open'
    );
    expect(renderedOptions.find('[data-test-subj="optionDocs"]').text()).toEqual(
      'Docs count:\u00a0100'
    );
    expect(renderedOptions.find('[data-test-subj="optionStorage"]').text()).toEqual(
      'Storage size:\u00a0108Kb'
    );
  });

  it('calls loadIndices on mount', () => {
    shallow(<SearchIndexSelectable />);
    expect(MOCK_ACTIONS.loadIndices).toHaveBeenCalled();
  });

  it('renders - on rows for missing information', () => {
    const wrapper = shallow(<SearchIndexSelectable />);
    const selectable = wrapper.find(EuiSelectable);
    const customOptions = selectable.prop('renderOption')!;
    const renderedOptions = mount(
      <>{customOptions({ label: 'search-missing-data' }, 'search-')}</>
    );

    expect(renderedOptions.find(EuiHighlight).text()).toEqual('search-missing-data');
    expect(renderedOptions.find(EuiIcon).prop('color')).toEqual('');
    expect(renderedOptions.find('[data-test-subj="optionStatus"]').text()).toEqual(
      'Status:\u00a0-'
    );
    expect(renderedOptions.find('[data-test-subj="optionDocs"]').text()).toEqual(
      'Docs count:\u00a0-'
    );
    expect(renderedOptions.find('[data-test-subj="optionStorage"]').text()).toEqual(
      'Storage size:\u00a0-'
    );
  });

  it('calls setSelectedIndex onChange', () => {
    const wrapper = shallow(<SearchIndexSelectable />);
    const onChangeHandler = wrapper.find(EuiSelectable).prop('onChange')!;
    onChangeHandler(DEFAULT_VALUES.indicesFormatted as SearchIndexSelectableOption[]);
    expect(MOCK_ACTIONS.setSelectedIndex).toHaveBeenCalledWith('search-test-index-2');
  });
});
