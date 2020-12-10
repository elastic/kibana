/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { mount } from 'enzyme';

import { Description, Name, NewTimeline, NewTimelineProps } from './helpers';
import { useCreateTimelineButton } from './use_create_timeline';
import * as i18n from './translations';
import { mockTimelineModel, TestProviders } from '../../../../common/mock';
import { TimelineType } from '../../../../../common/types/timeline';
import { useDeepEqualSelector } from '../../../../common/hooks/use_selector';

jest.mock('../../../../common/hooks/use_selector');

jest.mock('./use_create_timeline');

jest.mock('../../../../common/lib/kibana', () => ({
  useKibana: jest.fn().mockReturnValue({
    services: {
      application: {
        navigateToApp: () => Promise.resolve(),
        capabilities: {
          siem: {
            crud: true,
          },
        },
      },
    },
  }),
}));

describe('NewTimeline', () => {
  const mockGetButton = jest.fn();

  const props: NewTimelineProps = {
    closeGearMenu: jest.fn(),
    timelineId: 'mockTimelineId',
    title: 'mockTitle',
  };

  describe('render', () => {
    describe('default', () => {
      beforeAll(() => {
        (useCreateTimelineButton as jest.Mock).mockReturnValue({ getButton: mockGetButton });
        mount(<NewTimeline {...props} />);
      });

      afterAll(() => {
        jest.clearAllMocks();
      });

      test('it should not render outline', () => {
        expect(mockGetButton.mock.calls[0][0].outline).toEqual(false);
      });

      test('it should render title', () => {
        expect(mockGetButton.mock.calls[0][0].title).toEqual(props.title);
      });
    });

    describe('show outline', () => {
      beforeAll(() => {
        (useCreateTimelineButton as jest.Mock).mockReturnValue({ getButton: mockGetButton });

        const enableOutline = {
          ...props,
          outline: true,
        };
        mount(<NewTimeline {...enableOutline} />);
      });

      afterAll(() => {
        jest.clearAllMocks();
      });

      test('it should  render outline', () => {
        expect(mockGetButton.mock.calls[0][0].outline).toEqual(true);
      });

      test('it should render title', () => {
        expect(mockGetButton.mock.calls[0][0].title).toEqual(props.title);
      });
    });
  });
});

describe('Description', () => {
  const props = {
    description: 'xxx',
    timelineId: 'timeline-1',
    updateDescription: jest.fn(),
  };

  test('should render tooltip', () => {
    const component = mount(
      <TestProviders>
        <Description {...props} />
      </TestProviders>
    );
    expect(
      component.find('[data-test-subj="timeline-description-tool-tip"]').first().prop('content')
    ).toEqual(i18n.DESCRIPTION_TOOL_TIP);
  });

  test('should not render textarea if isTextArea is false', () => {
    const component = mount(
      <TestProviders>
        <Description {...props} />
      </TestProviders>
    );
    expect(component.find('[data-test-subj="timeline-description-textarea"]').exists()).toEqual(
      false
    );

    expect(component.find('[data-test-subj="timeline-description-input"]').exists()).toEqual(true);
  });

  test('should render textarea if isTextArea is true', () => {
    const testProps = {
      ...props,
      isTextArea: true,
    };
    const component = mount(
      <TestProviders>
        <Description {...testProps} />
      </TestProviders>
    );
    expect(component.find('[data-test-subj="timeline-description-textarea"]').exists()).toEqual(
      true
    );
  });
});

describe('Name', () => {
  const props = {
    timelineId: 'timeline-1',
    timelineType: TimelineType.default,
    title: 'xxx',
    updateTitle: jest.fn(),
  };

  beforeAll(() => {
    (useDeepEqualSelector as jest.Mock).mockReturnValue(mockTimelineModel);
  });

  test('should render tooltip', () => {
    const component = mount(
      <TestProviders>
        <Name {...props} />
      </TestProviders>
    );
    expect(
      component.find('[data-test-subj="timeline-title-tool-tip"]').first().prop('content')
    ).toEqual(i18n.TITLE);
  });

  test('should render placeholder by timelineType - timeline', () => {
    const component = mount(
      <TestProviders>
        <Name {...props} />
      </TestProviders>
    );
    expect(
      component.find('[data-test-subj="timeline-title-input"]').first().prop('placeholder')
    ).toEqual(i18n.UNTITLED_TIMELINE);
  });

  test('should render placeholder by timelineType - timeline template', () => {
    (useDeepEqualSelector as jest.Mock).mockReturnValue({
      ...mockTimelineModel,
      timelineType: TimelineType.template,
    });
    const component = mount(
      <TestProviders>
        <Name {...props} />
      </TestProviders>
    );
    expect(
      component.find('[data-test-subj="timeline-title-input"]').first().prop('placeholder')
    ).toEqual(i18n.UNTITLED_TEMPLATE);
  });
});
