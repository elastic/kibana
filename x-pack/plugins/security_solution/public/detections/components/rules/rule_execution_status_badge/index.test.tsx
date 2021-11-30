/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';

import { RuleExecutionStatusBadge } from '.';

import { RuleExecutionStatus } from '../../../../../common/detection_engine/schemas/common/schemas';

describe('Component RuleExecutionStatus', () => {
  it('should render component correctly with capitalized status text', () => {
    render(<RuleExecutionStatusBadge status={RuleExecutionStatus.succeeded} />);

    expect(screen.getByText('Succeeded')).toBeInTheDocument();
  });
});
