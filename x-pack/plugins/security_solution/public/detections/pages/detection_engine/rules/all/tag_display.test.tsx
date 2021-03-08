/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mount, ReactWrapper } from 'enzyme';

import { TagsDisplay } from './tag_display';
import { TestProviders } from '../../../../../common/mock';
import { waitFor } from '@testing-library/react';

const mockTags = ['Elastic', 'Endpoint', 'Data Protection', 'ML', 'Continuous Monitoring'];

describe('When tag display loads', () => {
  let wrapper: ReactWrapper;
  beforeEach(() => {
    wrapper = mount(
      <TestProviders>
        <TagsDisplay tags={mockTags} />
      </TestProviders>
    );
  });
  it('visibly renders 3 initial tags', () => {
    for (let i = 0; i < 3; i++) {
      expect(wrapper.exists(`[data-test-subj="rules-table-column-tags-${i}"]`)).toBeTruthy();
    }
  });
  describe("when the 'see all' button is clicked", () => {
    beforeEach(() => {
      const seeAllButton = wrapper.find('[data-test-subj="tags-display-popover-button"] button');
      seeAllButton.simulate('click');
    });
    it('renders all the tags in the popover', async () => {
      await waitFor(() => {
        wrapper.update();
        expect(wrapper.exists('[data-test-subj="tags-display-popover"]')).toBeTruthy();
        for (let i = 0; i < mockTags.length; i++) {
          expect(
            wrapper.exists(`[data-test-subj="rules-table-column-popover-tags-${i}"]`)
          ).toBeTruthy();
        }
      });
    });
  });
});
