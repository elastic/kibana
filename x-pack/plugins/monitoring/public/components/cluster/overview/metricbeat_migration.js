/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component } from 'react';
import {
  EuiCallOut,
  EuiButton,
  EuiButtonEmpty,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiTitle,
  EuiFieldText,
  EuiStepsHorizontal,
  EuiForm,
  EuiFormRow,
  EuiCard,
  EuiIcon,
  EuiFlexGrid
} from '@elastic/eui';

function getLogoForProductName(productName) {
  switch (productName) {
    case 'kibana':
      return 'logoKibana';
    case 'beats':
      return 'logoBeats';
    case 'apm':
      return 'logoAPM';
    case 'elasticsearch':
      return 'logoElasticsearch';
    case 'logstash':
      return 'logoLogstash';
  }
  return '';
}

function getProductLabelForProductName(productName) {
  switch (productName) {
    case 'kibana':
      return 'Kibana';
    case 'beats':
      return 'Beats';
    case 'apm':
      return 'APM';
    case 'elasticsearch':
      return 'Elasticsearch';
    case 'logstash':
      return 'Logstash';
  }
  return '';
}

function getStatus(capabilities) {
  const status = {
    label: '',
    icon: ''
  };

  if (capabilities.isFullyMigrated) {
    status.label = 'Product is fully migrated.';
    status.icon = 'check';
  }
  else if (capabilities.isInternalCollector) {
    status.label = 'Products needs migration.';
    status.icon = 'cross';
  }
  else if (capabilities.isNetNewUser) {
    status.label = 'Product not found.';
    status.icon = 'questionInCircle';
  }
  else if (capabilities.isPartiallyUpgraded) {
    status.label = 'Product is partially upgraded.';
    status.icon = 'branch';
  }

  return status;
}

export class MetricbeatMigration extends Component {
  constructor(props) {
    super(props);

    this.state = {
      isShowingFlyout: true,
      activeStep: 2,
      monitoringUrl: props.monitoringHosts ? props.monitoringHosts[0] : ''
    };
  }

  renderActiveStep() {
    const { activeStep, monitoringUrl } = this.state;
    const { clusterCapabilities } = this.props;

    switch (activeStep) {
      case 1:
        return (
          <EuiForm>
            <EuiFormRow
              label="Monitoring cluster URL"
              helpText="The running metricbeat instance will need to be able to react this location."
            >
              <EuiFieldText value={monitoringUrl} onChange={e => this.setState({ monitoringUrl: e.target.value })}/>
            </EuiFormRow>
            <EuiButton type="submit" fill onClick={() => this.setState({ activeStep: 2 })}>
              Next
            </EuiButton>
          </EuiForm>
        );
      case 2:
        return (
          <EuiFlexGrid gutterSize="l" columns={3}>
            { Object.entries(clusterCapabilities).map(([ productName, capabilities], index) => {
              const status = getStatus(capabilities);

              return (
                <EuiFlexItem key={index}>
                  <EuiCard
                    icon={<EuiIcon size="xxl" type={getLogoForProductName(productName)} />}
                    title={getProductLabelForProductName(productName)}
                    betaBadgeLabel={status.label}
                    description={(
                      <div>
                        {status.label}
                      </div>
                    )}
                    footer={(
                      <div>
                        <EuiButton>Go for it</EuiButton>
                        <EuiSpacer size="xs"/>
                      </div>
                    )}
                  />
                </EuiFlexItem>
              );
            })}
          </EuiFlexGrid>
        );
    }

    return null;
  }

  renderFlyout() {
    const { isShowingFlyout, activeStep } = this.state;

    if (!isShowingFlyout) {
      return null;
    }

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
        onClose={() => this.setState({ isShowingFlyout: false })}
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
          {this.renderActiveStep()}
        </EuiFlyoutBody>
      </EuiFlyout>
    );
  }

  render() {
    const { clusterCapabilities } = this.props;

    const isFullyMigrated = Object.values(clusterCapabilities).reduce((isFullyMigrated, cap) => {
      return isFullyMigrated && cap.isFullyMigrated;
    }, true);

    if (isFullyMigrated) {
      return null;
    }

    let title = '';
    if (clusterCapabilities.isInternalCollector) {
      title = 'Hey! You are using internal collection. Why?';
    }

    return (
      <div>
        <EuiCallOut
          title={title}
          color="warning"
        >
          <EuiFlexGroup gutterSize="s" alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiButton fill={true} onClick={() => this.setState({ isShowingFlyout: true })}>
               Use Wizard
              </EuiButton>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty href="http://www.elastic.co">
                Use the docs
              </EuiButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiCallOut>
        <EuiSpacer/>
        {this.renderFlyout()}
      </div>
    );
  }
}
