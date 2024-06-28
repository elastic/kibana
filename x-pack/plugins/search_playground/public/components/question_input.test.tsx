/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton } from '@elastic/eui';
import React from 'react';
import { render } from '@testing-library/react';
import { QuestionInput } from './question_input';

const mockButton = (
  <EuiButton data-test="btn" className="btn" onClick={() => {}}>
    Some text
  </EuiButton>
);
describe('Question Input', () => {
  describe('renders', () => {
    it('correctly', () => {
      const { queryByTestId } = render(
        <QuestionInput value="value" onChange={() => {}} button={mockButton} isDisabled={false} />
      );

      expect(queryByTestId('questionInput')).toBeInTheDocument();
    });

    it('disabled', () => {
      const { queryByTestId } = render(
        <QuestionInput value="value" onChange={() => {}} button={mockButton} isDisabled={true} />
      );

      expect(queryByTestId('questionInput')).toBeDisabled();
    });

    it('with value', () => {
      const { queryByTestId } = render(
        <QuestionInput
          value="my question"
          onChange={() => {}}
          button={mockButton}
          isDisabled={true}
        />
      );

      expect(queryByTestId('questionInput')).toHaveDisplayValue('my question');
    });
  });
});
