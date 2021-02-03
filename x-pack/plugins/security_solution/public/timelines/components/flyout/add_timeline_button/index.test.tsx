/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount, ReactWrapper } from 'enzyme';
import React from 'react';
import { waitFor } from '@testing-library/react';

import { AddTimelineButton } from './';
import { useKibana } from '../../../../common/lib/kibana';
import { TimelineId } from '../../../../../common/types/timeline';

jest.mock('../../../../common/lib/kibana', () => ({
  useKibana: jest.fn(),
  useUiSetting$: jest.fn().mockReturnValue([]),
}));

jest.mock('../../timeline/properties/new_template_timeline', () => ({
  NewTemplateTimeline: jest.fn(() => <div data-test-subj="create-template-btn" />),
}));

jest.mock('../../timeline/properties/helpers', () => ({
  Description: jest.fn().mockReturnValue(<div data-test-subj="Description" />),
  ExistingCase: jest.fn().mockReturnValue(<div data-test-subj="ExistingCase" />),
  NewCase: jest.fn().mockReturnValue(<div data-test-subj="NewCase" />),
  NewTimeline: jest.fn().mockReturnValue(<div data-test-subj="create-default-btn" />),
  NotesButton: jest.fn().mockReturnValue(<div data-test-subj="NotesButton" />),
}));

jest.mock('../../../../common/components/inspect', () => ({
  InspectButton: jest.fn().mockReturnValue(<div />),
  InspectButtonContainer: jest.fn(({ children }) => <div>{children}</div>),
}));

describe('AddTimelineButton', () => {
  let wrapper: ReactWrapper;
  const props = {
    timelineId: TimelineId.active,
  };

  describe('with crud', () => {
    beforeEach(() => {
      (useKibana as jest.Mock).mockReturnValue({
        services: {
          application: {
            capabilities: {
              siem: {
                crud: true,
              },
            },
          },
        },
      });
      wrapper = mount(<AddTimelineButton {...props} />);
    });

    afterEach(() => {
      (useKibana as jest.Mock).mockReset();
    });

    test('it renders settings-plus-in-circle', () => {
      expect(wrapper.find('[data-test-subj="settings-plus-in-circle"]').exists()).toBeTruthy();
    });

    test('it renders create timeline btn', async () => {
      await waitFor(() => {
        wrapper.find('[data-test-subj="settings-plus-in-circle"]').last().simulate('click');
        expect(wrapper.find('[data-test-subj="create-default-btn"]').exists()).toBeTruthy();
      });
    });

    test('it renders create timeline template btn', async () => {
      await waitFor(() => {
        wrapper.find('[data-test-subj="settings-plus-in-circle"]').last().simulate('click');
        expect(wrapper.find('[data-test-subj="create-template-btn"]').exists()).toBeTruthy();
      });
    });

    test('it renders Open timeline btn', async () => {
      await waitFor(() => {
        wrapper.find('[data-test-subj="settings-plus-in-circle"]').last().simulate('click');
        expect(wrapper.find('[data-test-subj="open-timeline-button"]').exists()).toBeTruthy();
      });
    });
  });

  describe('with no crud', () => {
    beforeEach(async () => {
      (useKibana as jest.Mock).mockReturnValue({
        services: {
          application: {
            capabilities: {
              siem: {
                crud: false,
              },
            },
          },
        },
      });
      wrapper = mount(<AddTimelineButton {...props} />);
    });

    afterEach(() => {
      (useKibana as jest.Mock).mockReset();
    });

    test('it renders settings-plus-in-circle', () => {
      expect(wrapper.find('[data-test-subj="settings-plus-in-circle"]').exists()).toBeTruthy();
    });

    test('it renders create timeline btn', async () => {
      await waitFor(() => {
        wrapper.find('[data-test-subj="settings-plus-in-circle"]').last().simulate('click');
        expect(wrapper.find('[data-test-subj="create-default-btn"]').exists()).toBeTruthy();
      });
    });

    test('it renders create timeline template btn', async () => {
      await waitFor(() => {
        wrapper.find('[data-test-subj="settings-plus-in-circle"]').last().simulate('click');
        expect(wrapper.find('[data-test-subj="create-template-btn"]').exists()).toBeTruthy();
      });
    });

    test('it renders Open timeline btn', async () => {
      await waitFor(() => {
        wrapper.find('[data-test-subj="settings-plus-in-circle"]').last().simulate('click');
        expect(wrapper.find('[data-test-subj="open-timeline-button"]').exists()).toBeTruthy();
      });
    });
  });
});
