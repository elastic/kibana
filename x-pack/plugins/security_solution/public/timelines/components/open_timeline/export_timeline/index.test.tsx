/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow } from 'enzyme';
import { EditTimelineActionsComponent } from '.';

describe('EditTimelineActionsComponent', () => {
  describe('render', () => {
    const props = {
      deleteTimelines: jest.fn(),
      ids: ['id1'],
      isEnableDownloader: false,
      isDeleteTimelineModalOpen: false,
      onComplete: jest.fn(),
      title: 'mockTitle',
    };

    test('should render timelineDownloader', () => {
      const wrapper = shallow(<EditTimelineActionsComponent {...props} />);

      expect(wrapper.find('[data-test-subj="TimelineDownloader"]').exists()).toBeTruthy();
    });

    test('Should render DeleteTimelineModalOverlay if deleteTimelines is given', () => {
      const wrapper = shallow(<EditTimelineActionsComponent {...props} />);

      expect(wrapper.find('[data-test-subj="DeleteTimelineModalOverlay"]').exists()).toBeTruthy();
    });

    test('Should not render DeleteTimelineModalOverlay if deleteTimelines is not given', () => {
      const newProps = {
        ...props,
        deleteTimelines: undefined,
      };
      const wrapper = shallow(<EditTimelineActionsComponent {...newProps} />);
      expect(
        wrapper.find('[data-test-subj="DeleteTimelineModalOverlay"]').exists()
      ).not.toBeTruthy();
    });
  });
});
