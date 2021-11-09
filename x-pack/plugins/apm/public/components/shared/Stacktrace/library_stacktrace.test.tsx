/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { composeStories } from '@storybook/testing-react';
import { render, screen } from '@testing-library/react';
import React from 'react';
import * as stories from './library_stacktrace.stories';

const { Example } = composeStories(stories);

describe('LibraryStacktrace', () => {
  describe('render', () => {
    describe('with no stack frames', () => {
      it('renders null', () => {
        const props = { id: 'testId', stackframes: [] };
        render(<Example {...props} />);

        expect(
          screen.queryByTestId('LibraryStacktraceAccordion')
        ).not.toBeInTheDocument();
      });
    });

    describe('with stack frames', () => {
      it('renders an accordion', () => {
        const props = {
          id: 'testId',
          stackframes: [{ filename: 'testFilename', line: { number: 1 } }],
        };
        render(<Example {...props} />);

        expect(
          screen.queryByTestId('LibraryStacktraceAccordion')
        ).toBeInTheDocument();
      });
    });
  });
});
