/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { shallow } from 'enzyme';
import React from 'react';
import { AgentMarker } from './AgentMarker';
import { AgentMark } from '../../../../app/transaction_details/WaterfallWithSummmary/WaterfallContainer/Marks/get_agent_marks';
import { EuiThemeProvider } from '../../../../../../../../../src/plugins/kibana_react/common';

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
