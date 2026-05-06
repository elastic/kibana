/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { AgentMark } from './agent_marker';
import { AgentMarker } from './agent_marker';
import { renderWithTheme } from '../../../../../utils/test_helpers';

describe('AgentMarker', () => {
  it('renders correctly', () => {
    const mark: AgentMark = {
      id: 'agent',
      offset: 1000,
      type: 'agentMark',
      verticalLine: true,
    };

    const { container } = renderWithTheme(<AgentMarker mark={mark} />);

    expect(container).toMatchSnapshot();
  });
});
