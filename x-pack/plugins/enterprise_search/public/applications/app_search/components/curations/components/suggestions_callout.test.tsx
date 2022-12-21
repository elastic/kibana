/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '../../../../__mocks__/react_router';

jest.mock('../../../../shared/use_local_storage', () => ({
  useLocalStorage: jest.fn(),
}));

import React from 'react';

import { useLocation } from 'react-router-dom';

import { shallow } from 'enzyme';

import { EuiButtonEmpty, EuiCallOut } from '@elastic/eui';

import { EuiButtonTo } from '../../../../shared/react_router_helpers';
import { useLocalStorage } from '../../../../shared/use_local_storage';

import { SuggestionsCallout } from './suggestions_callout';

const props = {
  title: 'Title',
  description: 'A description.',
  buttonTo: '/suggestions',
};

const now = '2021-01-01T00:30:00Z';
const tenMinutesAgo = '2021-01-01T00:20:00Z';
const twentyMinutesAgo = '2021-01-01T00:10:00Z';

describe('SuggestionsCallout', () => {
  const mockSetLastDismissedTimestamp = jest.fn();
  const setMockLastDismissedTimestamp = (lastDismissedTimestamp: string) => {
    (useLocalStorage as jest.Mock).mockImplementation(() => [
      lastDismissedTimestamp,
      mockSetLastDismissedTimestamp,
    ]);
  };

  beforeEach(() => {
    jest.clearAllMocks();
    setMockLastDismissedTimestamp(tenMinutesAgo);
    (useLocation as jest.Mock).mockImplementationOnce(() => ({
      pathname: '/engines/some-engine',
    }));
  });

  it('renders a callout with a link to the suggestions', () => {
    const wrapper = shallow(<SuggestionsCallout {...props} lastUpdatedTimestamp={now} />);

    expect(wrapper.find(EuiCallOut));
    expect(wrapper.find(EuiButtonTo).prop('to')).toEqual('/suggestions');
  });

  it('is empty is it was updated before it was last dismissed', () => {
    const wrapper = shallow(
      <SuggestionsCallout {...props} lastUpdatedTimestamp={twentyMinutesAgo} />
    );

    expect(wrapper.isEmptyRender()).toBe(true);
  });

  it('clicking the dismiss button updates the timestamp in local storage', () => {
    jest.spyOn(global.Date.prototype, 'toISOString').mockImplementation(() => now);

    const wrapper = shallow(<SuggestionsCallout {...props} lastUpdatedTimestamp={now} />);
    wrapper.find(EuiButtonEmpty).simulate('click');

    expect(mockSetLastDismissedTimestamp).toHaveBeenCalledWith(now);
  });
});
