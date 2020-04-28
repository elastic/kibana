/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { mount } from 'enzyme';
/* eslint-disable @kbn/eslint/module_migration */
import routeData from 'react-router';
/* eslint-enable @kbn/eslint/module_migration */
import { InsertTimelinePopoverComponent } from './';

const mockDispatch = jest.fn();
jest.mock('react-redux', () => {
  const reactRedux = jest.requireActual('react-redux');
  return {
    ...reactRedux,
    useDispatch: () => mockDispatch,
  };
});
const mockLocation = {
  pathname: '/apath',
  hash: '',
  search: '',
  state: '',
};
const mockLocationWithState = {
  ...mockLocation,
  state: {
    insertTimeline: {
      timelineId: 'timeline-id',
      timelineSavedObjectId: '34578-3497-5893-47589-34759',
      timelineTitle: 'Timeline title',
    },
  },
};

const onTimelineChange = jest.fn();
const defaultProps = {
  isDisabled: false,
  onTimelineChange,
};

describe('Insert timeline popover ', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('should insert a timeline when passed in the router state', () => {
    jest.spyOn(routeData, 'useLocation').mockReturnValue(mockLocationWithState);
    mount(<InsertTimelinePopoverComponent {...defaultProps} />);
    expect(mockDispatch).toBeCalledWith({
      payload: { id: 'timeline-id', show: false },
      type: 'x-pack/siem/local/timeline/SHOW_TIMELINE',
    });
    expect(onTimelineChange).toBeCalledWith('Timeline title', '34578-3497-5893-47589-34759');
  });
  it('should do nothing when router state', () => {
    jest.spyOn(routeData, 'useLocation').mockReturnValue(mockLocation);
    mount(<InsertTimelinePopoverComponent {...defaultProps} />);
    expect(mockDispatch).toHaveBeenCalledTimes(0);
    expect(onTimelineChange).toHaveBeenCalledTimes(0);
  });
});
