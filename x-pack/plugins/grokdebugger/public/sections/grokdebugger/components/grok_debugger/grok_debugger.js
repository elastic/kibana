/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { EuiForm, EuiButton, EuiPanel } from '@elastic/eui';
import { EventInput } from '../event_input';
import { PatternInput } from '../pattern_input';
import { CustomPatternsInput } from '../custom_patterns_input';
import { EventOutput } from '../event_output';

export class GrokDebugger extends React.Component {
  state = {
    rawEvent: '',
    pattern: '',
    customPatterns: '',
    structuredEvent: '',
    isSimulateEnabled: false
  };

  onRawEventChange = (rawEvent) => {
    this.setState({ rawEvent });
  }

  onPatternChange = (pattern) => {
    this.setState({ pattern });
  }

  onCustomPatternsChange = (customPatterns) => {
    this.setState({ customPatterns });
  }

  onSimulateClick = () => {
    console.log('simulate clicked');
  }

  render() {
    return (
      <EuiPanel paddingSize="l">
        <EuiForm
          className="grokdebugger-container"
          data-test-subj="grokDebugger"
        >
          <EventInput
            value={this.state.rawEvent}
            onChange={this.onRawEventChange}
          />
          <PatternInput
            value={this.state.pattern}
            onChange={this.onPatternChange}
          />
          <CustomPatternsInput
            value={this.state.customPatterns}
            onChange={this.onCustomPatternsChange}
          />
          <EuiButton
            fill
            onClick={this.onSimulateClick}
            isDisabled={!this.state.isSimulateEnabled}
          >
            Simulate
          </EuiButton>
          <EventOutput value={this.state.structuredEvent} />
        </EuiForm>
      </EuiPanel>
    );
  }
}
