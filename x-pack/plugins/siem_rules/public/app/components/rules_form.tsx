/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiButton,
  EuiFieldNumber,
  EuiFieldText,
  EuiForm,
  EuiFormRow,
  EuiPage,
  EuiPageBody,
  EuiPageContent,
  EuiPageContentBody,
  EuiPageContentHeader,
  EuiPageContentHeaderSection,
  EuiText,
  EuiTextArea,
  EuiTitle,
} from '@elastic/eui';
import React from 'react';
import { fetch } from '../../../lib/fetch';

export function SIEMRuleForm() {
  return (
    <EuiPage>
      <EuiPageBody>
        <EuiPageContent>
          <EuiPageContentHeader>
            <EuiPageContentHeaderSection>
              <EuiTitle>
                <h2>SIEM Rules</h2>
              </EuiTitle>
            </EuiPageContentHeaderSection>
          </EuiPageContentHeader>
          <EuiPageContentBody>
            <RuleForm />
          </EuiPageContentBody>
        </EuiPageContent>
      </EuiPageBody>
    </EuiPage>
  );
}

class RuleForm extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      name: '',
      query: '',
      indexPattern: 'auditbeat-*',
      interval: 1,
      lookbackMinutes: 5,
    };

    this.handleChange = this.handleChange.bind(this);
  }

  public render() {
    return (
      <EuiForm>
        <EuiFormRow label="Rule name" helpText="Give a name to this rule.">
          <EuiFieldText name="name" value={this.state.name} onChange={this.handleChange} />
        </EuiFormRow>

        <EuiFormRow label="Query" helpText="Elasticsearch query to run periodically.">
          <EuiTextArea
            name="query"
            placeholder="event.action:socket_opened AND destination.ip:169.254.169.254"
            value={this.state.query}
            onChange={this.handleChange}
          />
        </EuiFormRow>

        <EuiFormRow label="Index pattern" helpText="Index pattern where to run the query">
          <EuiFieldText
            name="indexPattern"
            value={this.state.indexPattern}
            onChange={this.handleChange}
          />
        </EuiFormRow>

        <EuiFormRow label="Run every" helpText="How often to execute this query.">
          <EuiFieldNumber
            name="interval"
            style={{ textAlign: 'right' }}
            append={
              <EuiText size="xs">
                <strong>minutes</strong>
              </EuiText>
            }
            value={this.state.interval}
            onChange={this.handleChange}
          />
        </EuiFormRow>

        <EuiFormRow label="Lookback" helpText="How many minutes to search back in time.">
          <EuiFieldNumber
            name="lookbackMinutes"
            style={{ textAlign: 'right' }}
            append={
              <EuiText size="xs">
                <strong>minutes</strong>
              </EuiText>
            }
            value={this.state.lookbackMinutes}
            onChange={this.handleChange}
          />
        </EuiFormRow>

        <EuiButton fill onClick={() => this.submitForm()}>
          Schedule
        </EuiButton>
      </EuiForm>
    );
  }

  private handleChange(event) {
    const target = event.target;
    const name = target.name;
    let value = target.value;

    if (target.type === 'number') {
      value = parseInt(value, 10);
    }

    this.setState({
      [name]: value,
    });
  }

  private async submitForm() {
    // FIXME: use the correct path prefix
    const result = await fetch.post('/api/siem_rules/schedule', this.state);
  }
}
