/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Fragment, Component } from 'react';
import {
  EuiFlyout,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiTitle,
  EuiSpacer,
  EuiForm,
  EuiFormRow,
  EuiFieldText,
  EuiButton,
  EuiPanel,
  EuiSteps
} from '@elastic/eui';
import { getInstructionSteps } from '../instruction_steps';

export class Flyout extends Component {
  constructor(props) {
    super(props);

    this.state = {
      activeStep: 2,
      esMonitoringUrl: props.monitoringHosts ? props.monitoringHosts[0] : '',
      hasCheckedMigrationStatus: false,
      checkingMigrationStatus: false,
    };
  }

  shouldComponentUpdate(nextProps, nextState) {
    const productChanged = nextProps.product !== this.props.product;
    const stateChanged = nextState !== this.state;

    if (productChanged || stateChanged) {
      return true;
    }
    return false;
  }

  renderActiveStep() {
    const { product, updateProduct, productName, onClose } = this.props;
    const {
      activeStep,
      esMonitoringUrl,
      hasCheckedMigrationStatus,
      checkingMigrationStatus,
    } = this.state;

    switch (activeStep) {
      case 1:
        return (
          <EuiForm>
            <EuiFormRow
              label="Monitoring cluster URL"
              helpText="The running metricbeat instance will need to be able to react this location."
            >
              <EuiFieldText value={esMonitoringUrl} onChange={e => this.setState({ esMonitoringUrl: e.target.value })}/>
            </EuiFormRow>
            <EuiButton type="submit" fill onClick={() => this.setState({ activeStep: 2 })}>
              Next
            </EuiButton>
          </EuiForm>
        );
      case 2:
        const instructionSteps = getInstructionSteps(productName, product, {
          doneWithMigration: async () => {
            onClose();
          },
          kibanaUrl: '',
          esMonitoringUrl,
          checkForMigrationStatus: async () => {
            this.setState({ checkingMigrationStatus: true });
            await updateProduct();
            this.setState({ checkingMigrationStatus: false, hasCheckedMigrationStatus: true });
          },
          checkingMigrationStatus,
          hasCheckedMigrationStatus,
        });

        const migrationLabel = product.isFullyMigrated
          ? null
          : (
            <Fragment>
              <p>To migrate, following the following instructions:</p>
              <EuiSpacer size="m"/>
            </Fragment>
          );

        return (
          <Fragment>
            <EuiSpacer size="m"/>
            {migrationLabel}
            <EuiPanel>
              <EuiSteps steps={instructionSteps}/>
            </EuiPanel>
          </Fragment>
        );
    }

    return null;
  }

  render() {
    const { onClose } = this.props;
    // const { activeStep } = this.state;
    // const horizontalSteps = [
    //   {
    //     title: 'Configure monitoring cluster',
    //     isComplete: activeStep > 1,
    //     onClick: () => this.setState({ activeStep: 1 }),
    //   },
    //   {
    //     title: 'Setup stack products',
    //     isComplete: activeStep > 2,
    //     onClick: () => {
    //       this.setState({ activeStep: 2 });
    //     }
    //   }
    // ];

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
          {/* <EuiStepsHorizontal
            steps={horizontalSteps}
          />
          <EuiSpacer size="m"/> */}
          {this.renderActiveStep()}
        </EuiFlyoutBody>
      </EuiFlyout>
    );
  }
}
