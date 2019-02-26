/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Component } from 'react';
import {
  EuiFlyout,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiTitle,
  EuiStepsHorizontal,
  EuiSpacer,
  EuiForm,
  EuiFormRow,
  EuiFieldText,
  EuiButton,
} from '@elastic/eui';
import { Tabs } from '../tabs';

export class Flyout extends Component {
  state = {
    activeStep: 2,
  }

  renderActiveStep() {
    const { esMonitoringUrl, setMonitoringUrl, products, instructionOpts } = this.props;
    const { activeStep } = this.state;

    switch (activeStep) {
      case 1:
        return (
          <EuiForm>
            <EuiFormRow
              label="Monitoring cluster URL"
              helpText="The running metricbeat instance will need to be able to react this location."
            >
              <EuiFieldText value={esMonitoringUrl} onChange={e => setMonitoringUrl(e.target.value)}/>
            </EuiFormRow>
            <EuiButton type="submit" fill onClick={() => this.setState({ activeStep: 2 })}>
              Next
            </EuiButton>
          </EuiForm>
        );
      case 2:
        return (
          <Tabs
            products={products}
            instructionOpts={instructionOpts}
          />
        );
    }

    return null;
  }

  render() {
    const { onClose } = this.props;
    const { activeStep } = this.state;
    const horizontalSteps = [
      {
        title: 'Configure monitoring cluster',
        isComplete: activeStep > 1,
        onClick: () => this.setState({ activeStep: 1 }),
      },
      {
        title: 'Setup stack products',
        isComplete: activeStep > 2,
        onClick: () => {
          this.setState({ activeStep: 2 });
        }
      }
    ];

    return (
      <EuiFlyout
        onClose={onClose}
        aria-labelledby="flyoutTitle"
      >
        <EuiFlyoutHeader hasBorder>
          <EuiTitle size="m">
            <h2 id="flyoutTitle">
              Migrate to Metricbeat
            </h2>
          </EuiTitle>
        </EuiFlyoutHeader>
        <EuiFlyoutBody>
          <EuiStepsHorizontal
            steps={horizontalSteps}
          />
          <EuiSpacer size="m"/>
          {this.renderActiveStep()}
        </EuiFlyoutBody>
      </EuiFlyout>
    );
  }
}
