/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mount } from 'enzyme';

import { TestProviders } from '../../../../common/mock';
import { useDeepEqualSelector } from '../../../../common/hooks/use_selector';
import { TimelineStatus, TimelineType } from '../../../../../common/api/timeline';
import { SaveTimelineModal } from './save_timeline_modal';
import * as i18n from './translations';

jest.mock('../../../../common/hooks/use_selector', () => ({
  useDeepEqualSelector: jest.fn(),
}));

jest.mock('../../timeline/properties/use_create_timeline', () => ({
  useCreateTimeline: jest.fn(),
}));

jest.mock('react-redux', () => {
  const actual = jest.requireActual('react-redux');
  return {
    ...actual,
    useDispatch: jest.fn(),
  };
});

describe('EditTimelineModal', () => {
  describe('save timeline', () => {
    const props = {
      initialFocusOn: 'title' as const,
      closeSaveTimeline: jest.fn(),
      timelineId: 'timeline-1',
    };

    const mockGetButton = jest.fn().mockReturnValue(<div data-test-subj="mock-discard-button" />);

    beforeEach(() => {
      (useDeepEqualSelector as jest.Mock).mockReturnValue({
        description: '',
        isSaving: true,
        status: TimelineStatus.draft,
        title: 'my timeline',
        timelineType: TimelineType.default,
      });
    });

    afterEach(() => {
      (useDeepEqualSelector as jest.Mock).mockReset();
      mockGetButton.mockClear();
    });

    test('show process bar while saving', () => {
      const component = mount(<SaveTimelineModal {...props} />, {
        wrappingComponent: TestProviders,
      });
      expect(component.find('[data-test-subj="progress-bar"]').exists()).toEqual(true);
    });

    test('Show correct header for edit timeline modal', () => {
      const component = mount(<SaveTimelineModal {...props} />, {
        wrappingComponent: TestProviders,
      });
      expect(component.find('[data-test-subj="modal-header"]').at(1).prop('children')).toEqual(
        i18n.SAVE_TIMELINE
      );
    });

    test('Show correct header for edit timeline template modal', () => {
      (useDeepEqualSelector as jest.Mock).mockReturnValue({
        description: '',
        isSaving: true,
        status: TimelineStatus.draft,
        title: 'my timeline',
        timelineType: TimelineType.template,
      });
      const component = mount(<SaveTimelineModal {...props} />, {
        wrappingComponent: TestProviders,
      });
      expect(component.find('[data-test-subj="modal-header"]').at(1).prop('children')).toEqual(
        i18n.SAVE_TIMELINE_TEMPLATE
      );
    });

    test('Show name field', () => {
      const component = mount(<SaveTimelineModal {...props} />, {
        wrappingComponent: TestProviders,
      });
      expect(component.find('[data-test-subj="save-timeline-title"]').exists()).toEqual(true);
    });

    test('Show description field', () => {
      const component = mount(<SaveTimelineModal {...props} />, {
        wrappingComponent: TestProviders,
      });
      expect(component.find('[data-test-subj="save-timeline-description"]').exists()).toEqual(true);
    });

    test('Show close button', () => {
      const component = mount(<SaveTimelineModal {...props} />, {
        wrappingComponent: TestProviders,
      });
      expect(component.find('[data-test-subj="close-button"]').exists()).toEqual(true);
    });

    test('Show saveButton', () => {
      const component = mount(<SaveTimelineModal {...props} />, {
        wrappingComponent: TestProviders,
      });
      expect(component.find('[data-test-subj="save-button"]').exists()).toEqual(true);
    });

    test('Does not show save as new switch', () => {
      const component = mount(<SaveTimelineModal {...props} />, {
        wrappingComponent: TestProviders,
      });
      expect(component.find('[data-test-subj="save-as-new-switch"]').exists()).toEqual(false);
    });
  });

  describe('update timeline', () => {
    const props = {
      initialFocusOn: 'title' as const,
      closeSaveTimeline: jest.fn(),
      timelineId: 'timeline-1',
    };

    const mockGetButton = jest.fn().mockReturnValue(<div data-test-subj="mock-discard-button" />);

    beforeEach(() => {
      (useDeepEqualSelector as jest.Mock).mockReturnValue({
        description: 'xxxx',
        isSaving: true,
        status: TimelineStatus.active,
        title: 'my timeline',
        timelineType: TimelineType.default,
      });
    });

    afterEach(() => {
      (useDeepEqualSelector as jest.Mock).mockReset();
      mockGetButton.mockClear();
    });

    test('show process bar while saving', () => {
      const component = mount(<SaveTimelineModal {...props} />, {
        wrappingComponent: TestProviders,
      });
      expect(component.find('[data-test-subj="progress-bar"]').exists()).toEqual(true);
    });

    test('Show correct header for save timeline modal', () => {
      const component = mount(<SaveTimelineModal {...props} />, {
        wrappingComponent: TestProviders,
      });
      expect(component.find('[data-test-subj="modal-header"]').at(1).prop('children')).toEqual(
        i18n.SAVE_TIMELINE
      );
    });

    test('Show correct header for edit timeline template modal', () => {
      (useDeepEqualSelector as jest.Mock).mockReturnValue({
        description: 'xxxx',
        isSaving: true,
        status: TimelineStatus.active,
        title: 'my timeline',
        timelineType: TimelineType.template,
      });
      const component = mount(<SaveTimelineModal {...props} />, {
        wrappingComponent: TestProviders,
      });
      expect(component.find('[data-test-subj="modal-header"]').at(1).prop('children')).toEqual(
        i18n.NAME_TIMELINE_TEMPLATE
      );
    });

    test('Show name field', () => {
      const component = mount(<SaveTimelineModal {...props} />, {
        wrappingComponent: TestProviders,
      });
      expect(component.find('[data-test-subj="save-timeline-title"]').exists()).toEqual(true);
    });

    test('Show description field', () => {
      const component = mount(<SaveTimelineModal {...props} />, {
        wrappingComponent: TestProviders,
      });
      expect(component.find('[data-test-subj="save-timeline-description"]').exists()).toEqual(true);
    });

    test('Show saveButton', () => {
      const component = mount(<SaveTimelineModal {...props} />, {
        wrappingComponent: TestProviders,
      });
      expect(component.find('[data-test-subj="save-button"]').exists()).toEqual(true);
    });

    test('Show save as new switch', () => {
      const component = mount(<SaveTimelineModal {...props} />, {
        wrappingComponent: TestProviders,
      });
      expect(component.find('[data-test-subj="save-as-new-switch"]').exists()).toEqual(true);
    });
  });

  describe('showWarning', () => {
    const props = {
      initialFocusOn: 'title' as const,
      closeSaveTimeline: jest.fn(),
      timelineId: 'timeline-1',
      showWarning: true,
    };

    const mockGetButton = jest.fn().mockReturnValue(<div data-test-subj="mock-discard-button" />);

    beforeEach(() => {
      (useDeepEqualSelector as jest.Mock).mockReturnValue({
        description: '',
        isSaving: true,
        status: TimelineStatus.draft,
        title: 'my timeline',
        timelineType: TimelineType.default,
        showWarnging: true,
      });
    });

    afterEach(() => {
      (useDeepEqualSelector as jest.Mock).mockReset();
      mockGetButton.mockClear();
    });

    test('Show EuiCallOut', () => {
      const component = mount(<SaveTimelineModal {...props} />, {
        wrappingComponent: TestProviders,
      });
      expect(component.find('[data-test-subj="edit-timeline-callout"]').exists()).toEqual(true);
    });

    test('Show discardTimelineButton', () => {
      const component = mount(<SaveTimelineModal {...props} />, {
        wrappingComponent: TestProviders,
      });
      expect(component.find('[data-test-subj="close-button"]').at(2).text()).toEqual(
        'Discard Timeline'
      );
    });

    test('get discardTimelineTemplateButton with correct props', () => {
      (useDeepEqualSelector as jest.Mock).mockReturnValue({
        description: 'xxxx',
        isSaving: true,
        status: TimelineStatus.draft,
        title: 'my timeline',
        timelineType: TimelineType.template,
      });
      const component = mount(<SaveTimelineModal {...props} />, {
        wrappingComponent: TestProviders,
      });
      expect(component.find('[data-test-subj="close-button"]').at(2).text()).toEqual(
        'Discard Timeline Template'
      );
    });

    test('Show saveButton', () => {
      const component = mount(<SaveTimelineModal {...props} />);
      expect(component.find('[data-test-subj="save-button"]').at(1).exists()).toEqual(true);
    });
  });
});
