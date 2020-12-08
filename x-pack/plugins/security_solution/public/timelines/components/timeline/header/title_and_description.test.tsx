/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow } from 'enzyme';
import { TimelineTitleAndDescription } from './title_and_description';
import { useDeepEqualSelector } from '../../../../common/hooks/use_selector';
import { useCreateTimelineButton } from '../properties/use_create_timeline';
import { TimelineType } from '../../../../../common/types/timeline';
import * as i18n from './translations';

jest.mock('../../../../common/hooks/use_selector', () => ({
  useDeepEqualSelector: jest.fn(),
}));

jest.mock('../properties/use_create_timeline', () => ({
  useCreateTimelineButton: jest.fn(),
}));

jest.mock('react-redux', () => {
  const actual = jest.requireActual('react-redux');
  return {
    ...actual,
    useDispatch: jest.fn(),
  };
});

describe('TimelineTitleAndDescription', () => {
  describe('save timeline', () => {
    const props = {
      timelineId: 'timeline-1',
      toggleSaveTimeline: jest.fn(),
      onSaveTimeline: jest.fn(),
      updateTitle: jest.fn(),
      updateDescription: jest.fn(),
    };

    const mockGetButton = jest.fn().mockReturnValue(<div data-test-subj="mock-discard-button" />);

    beforeEach(() => {
      (useDeepEqualSelector as jest.Mock).mockReturnValue({
        description: '',
        isSaving: true,
        savedObjectId: null,
        title: 'my timeline',
        timelineType: TimelineType.default,
      });
      (useCreateTimelineButton as jest.Mock).mockReturnValue({
        getButton: mockGetButton,
      });
    });

    afterEach(() => {
      (useDeepEqualSelector as jest.Mock).mockReset();
      (useCreateTimelineButton as jest.Mock).mockReset();
      mockGetButton.mockClear();
    });

    test('show proress bar while saving', () => {
      const component = shallow(<TimelineTitleAndDescription {...props} />);
      expect(component.find('[data-test-subj="progress-bar"]').exists()).toEqual(true);
    });

    test('Show correct header for save timeline modal', () => {
      const component = shallow(<TimelineTitleAndDescription {...props} />);
      expect(component.find('[data-test-subj="modal-header"]').prop('children')).toEqual(
        i18n.SAVE_TIMELINE
      );
    });

    test('Show correct header for save timeline template modal', () => {
      (useDeepEqualSelector as jest.Mock).mockReturnValue({
        description: '',
        isSaving: true,
        savedObjectId: null,
        title: 'my timeline',
        timelineType: TimelineType.template,
      });
      const component = shallow(<TimelineTitleAndDescription {...props} />);
      expect(component.find('[data-test-subj="modal-header"]').prop('children')).toEqual(
        i18n.SAVE_TIMELINE_TEMPLATE
      );
    });

    test('Show name field', () => {
      const component = shallow(<TimelineTitleAndDescription {...props} />);
      expect(component.find('[data-test-subj="save-timeline-name"]').exists()).toEqual(true);
    });

    test('Show description field', () => {
      const component = shallow(<TimelineTitleAndDescription {...props} />);
      expect(component.find('[data-test-subj="save-timeline-description"]').exists()).toEqual(true);
    });

    test('Show close button', () => {
      const component = shallow(<TimelineTitleAndDescription {...props} />);
      expect(component.find('[data-test-subj="close-button"]').exists()).toEqual(true);
    });

    test('Show saveButton', () => {
      const component = shallow(<TimelineTitleAndDescription {...props} />);
      expect(component.find('[data-test-subj="save-button"]').exists()).toEqual(true);
    });
  });

  describe('update timeline', () => {
    const props = {
      timelineId: 'timeline-1',
      toggleSaveTimeline: jest.fn(),
      onSaveTimeline: jest.fn(),
      updateTitle: jest.fn(),
      updateDescription: jest.fn(),
    };

    const mockGetButton = jest.fn().mockReturnValue(<div data-test-subj="mock-discard-button" />);

    beforeEach(() => {
      (useDeepEqualSelector as jest.Mock).mockReturnValue({
        description: 'xxxx',
        isSaving: true,
        savedObjectId: '1234',
        title: 'my timeline',
        timelineType: TimelineType.default,
      });
      (useCreateTimelineButton as jest.Mock).mockReturnValue({
        getButton: mockGetButton,
      });
    });

    afterEach(() => {
      (useDeepEqualSelector as jest.Mock).mockReset();
      (useCreateTimelineButton as jest.Mock).mockReset();
      mockGetButton.mockClear();
    });

    test('show proress bar while saving', () => {
      const component = shallow(<TimelineTitleAndDescription {...props} />);
      expect(component.find('[data-test-subj="progress-bar"]').exists()).toEqual(true);
    });

    test('Show correct header for save timeline modal', () => {
      const component = shallow(<TimelineTitleAndDescription {...props} />);
      expect(component.find('[data-test-subj="modal-header"]').prop('children')).toEqual(
        i18n.NAME_TIMELINE
      );
    });

    test('Show correct header for save timeline template modal', () => {
      (useDeepEqualSelector as jest.Mock).mockReturnValue({
        description: 'xxxx',
        isSaving: true,
        savedObjectId: '1234',
        title: 'my timeline',
        timelineType: TimelineType.template,
      });
      const component = shallow(<TimelineTitleAndDescription {...props} />);
      expect(component.find('[data-test-subj="modal-header"]').prop('children')).toEqual(
        i18n.NAME_TIMELINE_TEMPLATE
      );
    });

    test('Show name field', () => {
      const component = shallow(<TimelineTitleAndDescription {...props} />);
      expect(component.find('[data-test-subj="save-timeline-name"]').exists()).toEqual(true);
    });

    test('Show description field', () => {
      const component = shallow(<TimelineTitleAndDescription {...props} />);
      expect(component.find('[data-test-subj="save-timeline-description"]').exists()).toEqual(true);
    });

    test('Show saveButton', () => {
      const component = shallow(<TimelineTitleAndDescription {...props} />);
      expect(component.find('[data-test-subj="save-button"]').exists()).toEqual(true);
    });
  });

  describe('showWarning', () => {
    const props = {
      timelineId: 'timeline-1',
      toggleSaveTimeline: jest.fn(),
      onSaveTimeline: jest.fn(),
      updateTitle: jest.fn(),
      updateDescription: jest.fn(),
      showWarning: true,
    };

    const mockGetButton = jest.fn().mockReturnValue(<div data-test-subj="mock-discard-button" />);

    beforeEach(() => {
      (useDeepEqualSelector as jest.Mock).mockReturnValue({
        description: '',
        isSaving: true,
        savedObjectId: null,
        title: 'my timeline',
        timelineType: TimelineType.default,
        showWarnging: true,
      });
      (useCreateTimelineButton as jest.Mock).mockReturnValue({
        getButton: mockGetButton,
      });
    });

    afterEach(() => {
      (useDeepEqualSelector as jest.Mock).mockReset();
      (useCreateTimelineButton as jest.Mock).mockReset();
      mockGetButton.mockClear();
    });

    test('Show EuiCallOut', () => {
      const component = shallow(<TimelineTitleAndDescription {...props} />);
      expect(component.find('[data-test-subj="save-timeline-callout"]').exists()).toEqual(true);
    });

    test('Show discardTimelineButton', () => {
      const component = shallow(<TimelineTitleAndDescription {...props} />);
      expect(component.find('[data-test-subj="mock-discard-button"]').exists()).toEqual(true);
    });

    test('get discardTimelineButton with correct props', () => {
      shallow(<TimelineTitleAndDescription {...props} />);
      expect(mockGetButton).toBeCalledWith({
        title: i18n.DISCARD_TIMELINE,
        outline: true,
        iconType: '',
        fill: false,
      });
    });

    test('get discardTimelineTemplateButton with correct props', () => {
      (useDeepEqualSelector as jest.Mock).mockReturnValue({
        description: 'xxxx',
        isSaving: true,
        savedObjectId: null,
        title: 'my timeline',
        timelineType: TimelineType.template,
      });
      shallow(<TimelineTitleAndDescription {...props} />);
      expect(mockGetButton).toBeCalledWith({
        title: i18n.DISCARD_TIMELINE_TEMPLATE,
        outline: true,
        iconType: '',
        fill: false,
      });
    });

    test('Show saveButton', () => {
      const component = shallow(<TimelineTitleAndDescription {...props} />);
      expect(component.find('[data-test-subj="save-button"]').exists()).toEqual(true);
    });
  });
});
