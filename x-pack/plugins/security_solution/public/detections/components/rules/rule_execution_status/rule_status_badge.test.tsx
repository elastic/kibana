/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';

import { RuleExecutionStatus } from '../../../../../common/detection_engine/schemas/common';
import { RuleStatusBadge } from './rule_status_badge';

describe('RuleStatusBadge', () => {
  it('renders capitalized status text', () => {
    render(<RuleStatusBadge status={RuleExecutionStatus.succeeded} />);

    expect(screen.getByText('Succeeded')).toBeInTheDocument();
  });
});
