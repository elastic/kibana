/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mountWithIntl } from 'test_utils/enzyme_helpers';
import React from 'react';

import { DeleteTimelineModalOverlay } from '.';

describe('DeleteTimelineModal', () => {
  const savedObjectId = 'abcd';
  const defaultProps = {
    closeModal: jest.fn(),
    deleteTimelines: jest.fn(),
    isModalOpen: true,
    savedObjectIds: [savedObjectId],
    title: 'Privilege Escalation',
  };

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
  });
});
