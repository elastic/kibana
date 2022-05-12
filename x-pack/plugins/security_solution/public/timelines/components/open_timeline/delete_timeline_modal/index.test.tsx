/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mountWithIntl } from '@kbn/test-jest-helpers';
import React from 'react';
import { useParams } from 'react-router-dom';

import { DeleteTimelineModalOverlay } from '.';
import { TimelineType } from '../../../../../common/types/timeline';
import * as i18n from '../translations';
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';

jest.mock('../../../../common/hooks/use_app_toasts');

jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return {
    ...actual,
    useParams: jest.fn(),
  };
});

describe('DeleteTimelineModal', () => {
  const mockAddSuccess = jest.fn();
  (useAppToasts as jest.Mock).mockReturnValue({ addSuccess: mockAddSuccess });

  afterEach(() => {
    mockAddSuccess.mockClear();
  });

  const savedObjectIds = ['abcd'];
  const defaultProps = {
    closeModal: jest.fn(),
    deleteTimelines: jest.fn(),
    isModalOpen: true,
    savedObjectIds,
    title: 'Privilege Escalation',
  };

  beforeAll(() => {
    (useParams as jest.Mock).mockReturnValue({ tabName: TimelineType.default });
  });

  describe('showModalState', () => {
    test('it does NOT render the modal when isModalOpen is false', () => {
      const testProps = {
        ...defaultProps,
        isModalOpen: false,
      };
      const wrapper = mountWithIntl(<DeleteTimelineModalOverlay {...testProps} />);

      expect(wrapper.find('[data-test-subj="delete-timeline-modal"]').first().exists()).toBe(false);
    });

    test('it renders the modal when isModalOpen is true', () => {
      const wrapper = mountWithIntl(<DeleteTimelineModalOverlay {...defaultProps} />);

      expect(wrapper.find('[data-test-subj="delete-timeline-modal"]').first().exists()).toBe(true);
    });

    test('it hides popover when isModalOpen is true', () => {
      const wrapper = mountWithIntl(<DeleteTimelineModalOverlay {...defaultProps} />);

      expect(wrapper.find('[data-test-subj="remove-popover"]').first().exists()).toBe(true);
    });

    test('it shows correct toast message on success for deleted timelines', async () => {
      const wrapper = mountWithIntl(<DeleteTimelineModalOverlay {...defaultProps} />);
      wrapper.find('button[data-test-subj="confirmModalConfirmButton"]').simulate('click');

      expect(mockAddSuccess.mock.calls[0][0].title).toEqual(
        i18n.SUCCESSFULLY_DELETED_TIMELINES(savedObjectIds.length)
      );
    });

    test('it shows correct toast message on success for deleted templates', async () => {
      (useParams as jest.Mock).mockReturnValue({ tabName: TimelineType.template });

      const wrapper = mountWithIntl(<DeleteTimelineModalOverlay {...defaultProps} />);
      wrapper.find('button[data-test-subj="confirmModalConfirmButton"]').simulate('click');

      expect(mockAddSuccess.mock.calls[0][0].title).toEqual(
        i18n.SUCCESSFULLY_DELETED_TIMELINE_TEMPLATES(savedObjectIds.length)
      );
    });
  });
});
