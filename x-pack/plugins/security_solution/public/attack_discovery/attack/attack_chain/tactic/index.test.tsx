/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import React from 'react';

import { Tactic } from '.';

describe('Tactic', () => {
  const tactic = 'Privilege Escalation';

  it('renders the tactic name', () => {
    render(<Tactic detected={false} tactic={tactic} />);

    const tacticText = screen.getByTestId('tacticText');

    expect(tacticText).toHaveTextContent(tactic);
  });

  const detectedTestCases: boolean[] = [true, false];

  detectedTestCases.forEach((detected) => {
    it(`renders the inner circle when detected is ${detected}`, () => {
      render(<Tactic detected={detected} tactic={tactic} />);

      const innerCircle = screen.getByTestId('innerCircle');

      expect(innerCircle).toBeInTheDocument();
    });

    it(`renders the outerCircle circle when detected is ${detected}`, () => {
      render(<Tactic detected={detected} tactic={tactic} />);

      const outerCircle = screen.getByTestId('outerCircle');

      expect(outerCircle).toBeInTheDocument();
    });
  });
});
