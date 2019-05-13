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
  EuiSteps,
  EuiFlyoutFooter,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty
} from '@elastic/eui';
import { getInstructionSteps } from '../instruction_steps';
import { Storage } from '../../../../../../../src/legacy/ui/public/storage/storage';
import { STORAGE_KEY } from '../../../../common/constants';

const storage = new Storage(window.localStorage);
const ES_MONITORING_URL_KEY = `${STORAGE_KEY}.mb_migration.esMonitoringUrl`;

export class Flyout extends Component {
  constructor(props) {
    super(props);


    let esMonitoringUrl = storage.get(ES_MONITORING_URL_KEY);
    if (!esMonitoringUrl) {
      esMonitoringUrl = props.monitoringHosts ? props.monitoringHosts[0] : '';
    }

    this.state = {
      activeStep: 1,
      esMonitoringUrl,
      hasCheckedMigrationStatus: false,
      checkingMigrationStatus: false,
    };
  }

  setEsMonitoringUrl = esMonitoringUrl => {
    storage.set(ES_MONITORING_URL_KEY, esMonitoringUrl);
    this.setState({ esMonitoringUrl });
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
              fullWidth
              label="Monitoring cluster URL"
              helpText={`This is typically a single instance, but if you have multiple, enter all of instance urls comma-separated.
              Keep in mind that the running metricbeat instance will need to be able to communicate with these Elasticsearch nodes.`}
            >
              <EuiFieldText
                value={esMonitoringUrl}
                placeholder="http://localhost:9200"
                onChange={e => this.setEsMonitoringUrl(e.target.value)}
              />
            </EuiFormRow>
          </EuiForm>
        );
      case 2:
        const instructionSteps = getInstructionSteps(productName, product, {
          doneWithMigration: async () => {
            onClose();
          },
          esMonitoringUrl,
          checkForMigrationStatus: async () => {
            this.setState({ checkingMigrationStatus: true });
            await updateProduct();
            this.setState({ checkingMigrationStatus: false, hasCheckedMigrationStatus: true });
          },
          checkingMigrationStatus,
          hasCheckedMigrationStatus,
        });

        return (
          <Fragment>
            <EuiSpacer size="m"/>
            <EuiSteps steps={instructionSteps}/>
          </Fragment>
        );
    }

    return null;
  }

  renderActiveStepNextButton() {
    const { activeStep, esMonitoringUrl } = this.state;

    if (activeStep === 1) {
      return (
        <EuiButton
          type="submit"
          fill
          iconType="sortRight"
          iconSide="right"
          isDisabled={esMonitoringUrl.length === 0}
          onClick={() => this.setState({ activeStep: 2 })}
        >
          Next
        </EuiButton>
      );
    }

    return null;
  }

  render() {
    const { onClose } = this.props;

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
          {this.renderActiveStep()}
        </EuiFlyoutBody>
        <EuiFlyoutFooter>
          <EuiFlexGroup justifyContent="spaceBetween">
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                iconType="cross"
                onClick={onClose}
                flush="left"
              >
                Close
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              {this.renderActiveStepNextButton()}
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutFooter>
      </EuiFlyout>
    );
  }
}
