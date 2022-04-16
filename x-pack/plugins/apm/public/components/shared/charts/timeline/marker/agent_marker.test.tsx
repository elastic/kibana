/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { shallow } from 'enzyme';
import React from 'react';
import { EuiThemeProvider } from '@kbn/kibana-react-plugin/common';
import { AgentMark } from '../../../../app/transaction_details/waterfall_with_summary/waterfall_container/marks/get_agent_marks';
import { AgentMarker } from './agent_marker';

describe('AgentMarker', () => {
  const mark = {
    id: 'agent',
    offset: 1000,
    type: 'agentMark',
    verticalLine: true,
  } as AgentMark;

  it('renders', () => {
    const component = shallow(
      <EuiThemeProvider>
        <AgentMarker mark={mark} />
      </EuiThemeProvider>
    );

    expect(component).toMatchSnapshot();
  });
});
