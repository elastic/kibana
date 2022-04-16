/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
// Prefer importing entire lodash library, e.g. import { get } from "lodash"
// eslint-disable-next-line no-restricted-imports
import isEmpty from 'lodash/isEmpty';

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
import { withKibana } from '@kbn/kibana-react-plugin/public';
import { FormattedMessage } from '@kbn/i18n-react';

const i18nTexts = {
  simulate: {
    errorTitle: i18n.translate('xpack.grokDebugger.simulate.errorTitle', {
      defaultMessage: 'Simulate error',
    }),
    unknownErrorTitle: i18n.translate('xpack.grokDebugger.unknownErrorTitle', {
      defaultMessage: 'Something went wrong',
    }),
  },
};

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
          title: i18nTexts.simulate.errorTitle,
          text: simulateResponse.error,
        });
      }
    } catch (e) {
      notifications.toasts.addError(e, {
        title: i18nTexts.simulate.unknownErrorTitle,
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
              <EuiForm className="grokdebugger-container" data-test-subj="grokDebuggerContainer">
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
