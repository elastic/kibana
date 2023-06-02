/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

import { Tags } from './tags';

describe('Tags', () => {
  describe('when list is short', () => {
    it('renders a comma-separated list of tags', () => {
      const tags = ['tag1', 'tag2'];
      render(<Tags tags={tags} />);

      expect(screen.getByTestId('agentTags')).toHaveTextContent('tag1, tag2');
    });
  });

  describe('when list is long', () => {
    it('renders a truncated list of tags with full list displayed in tooltip on hover', async () => {
      const tags = ['tag1', 'tag2', 'tag3', 'tag4', 'tag5'];
      render(<Tags tags={tags} />);

      const tagsNode = screen.getByTestId('agentTags');

      expect(tagsNode).toHaveTextContent('tag1, tag2, tag3 + 2 more');

      fireEvent.mouseEnter(tagsNode);
      await waitFor(() => {
        screen.getByTestId('agentTagsTooltip');
      });

      expect(screen.getByTestId('agentTagsTooltip')).toHaveTextContent(
        'tag1, tag2, tag3, tag4, tag5'
      );
    });

    it('renders a list of tags with tooltip on hover', async () => {
      const tags = ['tag1', 'tag2', 'tag3'];
      render(<Tags tags={tags} />);

      const tagsNode = screen.getByTestId('agentTags');

      expect(tagsNode).toHaveTextContent('tag1, tag2, tag3');

      fireEvent.mouseEnter(tagsNode);
      await waitFor(() => {
        screen.getByTestId('agentTagsTooltip');
      });

      expect(screen.getByTestId('agentTagsTooltip')).toHaveTextContent('tag1, tag2, tag3');
    });
  });
});
