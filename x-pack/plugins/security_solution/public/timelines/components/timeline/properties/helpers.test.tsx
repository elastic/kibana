/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { mount, shallow } from 'enzyme';
import { NewTimeline, NewTimelineProps } from './helpers';
import { useCreateTimelineButton } from './use_create_timeline';

jest.mock('./use_create_timeline', () => ({
  useCreateTimelineButton: jest.fn(),
}));

jest.mock('../../../../common/lib/kibana', () => {
  return {
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
  };
});

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
        shallow(<NewTimeline {...props} />);
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
