/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { isEmpty } from 'lodash';

import './brace_imports';

import {
  EuiForm,
  EuiButton,
  EuiPage,
  EuiPageBody,
  EuiPageContent,
  EuiPageContentBody,
  EuiSpacer,
} from '@elastic/eui';
import { EventInput } from '../event_input';
import { PatternInput } from '../pattern_input';
import { CustomPatternsInput } from '../custom_patterns_input';
import { EventOutput } from '../event_output';
import { GrokdebuggerRequest } from '../../models/grokdebugger_request';
import { withKibana } from '../../../../../../src/plugins/kibana_react/public';
import { FormattedMessage } from '@kbn/i18n/react';

export class GrokDebuggerComponent extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      rawEvent: '',
      pattern: '',
      customPatterns: '',
      structuredEvent: {},
    };
    this.grokdebuggerRequest = new GrokdebuggerRequest();
  }

  onRawEventChange = (rawEvent) => {
    this.setState({ rawEvent });
    this.grokdebuggerRequest.rawEvent = rawEvent.trimEnd();
  };

  onPatternChange = (pattern) => {
    this.setState({ pattern });
    this.grokdebuggerRequest.pattern = pattern.trimEnd();
  };

  onCustomPatternsChange = (customPatterns) => {
    this.setState({ customPatterns });

    customPatterns = customPatterns.trim();
    const customPatternsObj = {};

    if (!customPatterns) {
      this.grokdebuggerRequest.customPatterns = customPatternsObj;
      return;
    }

    customPatterns.split('\n').forEach((customPattern) => {
      // Patterns are defined like so:
      // patternName patternDefinition
      // For example:
      // POSTGRESQL %{DATESTAMP:timestamp} %{TZ} %{DATA:user_id} %{GREEDYDATA:connection_id} %{POSINT:pid}
      const [, patternName, patternDefinition] = customPattern.match(/(\S+)\s+(.+)/) || [];
      if (patternName && patternDefinition) {
        customPatternsObj[patternName] = patternDefinition;
      }
    });

    this.grokdebuggerRequest.customPatterns = customPatternsObj;
  };

  simulateGrok = async () => {
    const notifications = this.props.kibana.services.notifications;
    try {
      const simulateResponse = await this.props.grokdebuggerService.simulate(
        this.grokdebuggerRequest
      );
      this.setState({
        structuredEvent: simulateResponse.structuredEvent,
      });

      if (!isEmpty(simulateResponse.error)) {
        notifications.toasts.addDanger({
          body: simulateResponse.error,
        });
      }
    } catch (e) {
      notifications.toasts.addDanger({
        body: e,
      });
    }
  };

  onSimulateClick = () => {
    this.setState(
      {
        structuredEvent: {},
      },
      this.simulateGrok
    );
  };

  isSimulateDisabled = () => {
    return this.state.rawEvent.trim() === '' || this.state.pattern.trim() === '';
  };

  render() {
    return (
      <EuiPage>
        <EuiPageBody>
          <EuiPageContent>
            <EuiPageContentBody>
              <EuiForm className="grokdebugger-container" data-test-subj="grokDebugger">
                <EventInput value={this.state.rawEvent} onChange={this.onRawEventChange} />
                <PatternInput value={this.state.pattern} onChange={this.onPatternChange} />
                <EuiSpacer />
                <CustomPatternsInput
                  value={this.state.customPatterns}
                  onChange={this.onCustomPatternsChange}
                />
                <EuiSpacer />
                <EuiButton
                  fill
                  onClick={this.onSimulateClick}
                  isDisabled={this.isSimulateDisabled()}
                  data-test-subj="btnSimulate"
                >
                  <FormattedMessage
                    id="xpack.grokDebugger.simulateButtonLabel"
                    defaultMessage="Simulate"
                  />
                </EuiButton>
                <EuiSpacer />
                <EventOutput value={this.state.structuredEvent} />
              </EuiForm>
            </EuiPageContentBody>
          </EuiPageContent>
        </EuiPageBody>
      </EuiPage>
    );
  }
}

export const GrokDebugger = withKibana(GrokDebuggerComponent);
