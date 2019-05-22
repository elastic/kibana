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
import { ensureMinimumTime } from '../../../lib/ensure_minimum_time';
import { i18n } from '@kbn/i18n';
import {
  INSTRUCTION_STEP_SET_MONITORING_URL,
  INSTRUCTION_STEP_ENABLE_METRICBEAT,
  INSTRUCTION_STEP_DISABLE_INTERNAL
} from '../constants';

const storage = new Storage(window.localStorage);
const ES_MONITORING_URL_KEY = `${STORAGE_KEY}.mb_migration.esMonitoringUrl`;
const AUTO_CHECK_INTERVAL_IN_MS = 5000;

export class Flyout extends Component {
  constructor(props) {
    super(props);

    let esMonitoringUrl = storage.get(ES_MONITORING_URL_KEY);
    if (!esMonitoringUrl) {
      esMonitoringUrl = props.monitoringHosts ? props.monitoringHosts[0] : '';
    }

    this.checkInterval = null;

    this.state = {
      activeStep: INSTRUCTION_STEP_SET_MONITORING_URL,
      esMonitoringUrl,
      checkedStatusByStep: {
        [INSTRUCTION_STEP_ENABLE_METRICBEAT]: false,
        [INSTRUCTION_STEP_DISABLE_INTERNAL]: false,
      },
      checkingMigrationStatus: false,
    };
  }

  componentWillUpdate(_nextProps, nextState) {
    // We attempt to provide a better UX for the user by automatically rechecking
    // the status of their current step, once they have initiated a check manually.
    // The logic here aims to remove the recheck one they have moved on from the
    // step

    const thisActiveStep = this.state.activeStep;
    const nextActiveStep = nextState.activeStep;
    const nextEnableMbStatus = nextState.checkedStatusByStep[INSTRUCTION_STEP_ENABLE_METRICBEAT];
    const nowEnableMbStatus = this.state.checkedStatusByStep[INSTRUCTION_STEP_ENABLE_METRICBEAT];
    const nextDisableInternalStatus = nextState.checkedStatusByStep[INSTRUCTION_STEP_DISABLE_INTERNAL];
    const nowDisableInternalStatus = this.state.checkedStatusByStep[INSTRUCTION_STEP_DISABLE_INTERNAL];

    const setupInterval = (nextEnableMbStatus && !nowEnableMbStatus) || (nextDisableInternalStatus && !nowDisableInternalStatus);
    if (setupInterval) {
      this.checkInterval = setInterval(async () => {
        await this.checkForMigrationStatus();
      }, AUTO_CHECK_INTERVAL_IN_MS);
    }

    const removeInterval = thisActiveStep !== nextActiveStep;
    if (removeInterval && this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  checkForMigrationStatus = async () => {
    this.setState({ checkingMigrationStatus: true });
    await ensureMinimumTime(this.props.updateProduct(), 1000);
    this.setState(state => ({
      ...state,
      checkingMigrationStatus: false,
      checkedStatusByStep: {
        ...state.checkedStatusByStep,
        [this.state.activeStep]: true,
      }
    }));
  }

  setEsMonitoringUrl = esMonitoringUrl => {
    storage.set(ES_MONITORING_URL_KEY, esMonitoringUrl);
    this.setState({ esMonitoringUrl });
  }

  renderActiveStep() {
    const { product, productName, onClose, meta } = this.props;
    const {
      activeStep,
      esMonitoringUrl,
      checkedStatusByStep,
      checkingMigrationStatus,
    } = this.state;

    switch (activeStep) {
      case INSTRUCTION_STEP_SET_MONITORING_URL:
        return (
          <EuiForm>
            <EuiFormRow
              fullWidth
              label={i18n.translate('xpack.monitoring.metricbeat_migration.flyout.step1.monitoringUrlLabel', {
                defaultMessage: 'Monitoring cluster URL'
              })}
              helpText={i18n.translate('xpack.monitoring.metricbeat_migration.flyout.step1.monitoringUrlHelpText', {
                defaultMessage: `This is typically a single instance, but if you have multiple, enter all of instance urls comma-separated.
                Keep in mind that the running metricbeat instance will need to be able to communicate with these Elasticsearch nodes.`
              })}
            >
              <EuiFieldText
                value={esMonitoringUrl}
                placeholder="http://localhost:9200"
                onChange={e => this.setEsMonitoringUrl(e.target.value)}
              />
            </EuiFormRow>
          </EuiForm>
        );
      case INSTRUCTION_STEP_ENABLE_METRICBEAT:
      case INSTRUCTION_STEP_DISABLE_INTERNAL:
        const instructionSteps = getInstructionSteps(productName, product, activeStep, meta, {
          doneWithMigration: onClose,
          esMonitoringUrl,
          checkForMigrationStatus: this.checkForMigrationStatus,
          checkingMigrationStatus,
          hasCheckedStatus: checkedStatusByStep[activeStep],
          autoCheckIntervalInMs: AUTO_CHECK_INTERVAL_IN_MS
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
    const { product } = this.props;
    const { activeStep, esMonitoringUrl } = this.state;

    // It is possible that, during the migration steps, products are not reporting
    // monitoring data for a period of time outside the window of our server-side check
    // and this is most likely temporary so we want to be defensive and not error out
    // and hopefully wait for the next check and this state will be self-corrected.
    if (!product) {
      return null;
    }

    if (activeStep !== INSTRUCTION_STEP_DISABLE_INTERNAL) {
      let isDisabled = false;
      let nextStep = null;
      if (activeStep === INSTRUCTION_STEP_SET_MONITORING_URL) {
        isDisabled = esMonitoringUrl.length === 0;
        if (product.isPartiallyMigrated || product.isFullyMigrated) {
          nextStep = INSTRUCTION_STEP_DISABLE_INTERNAL;
        }
        else {
          nextStep = INSTRUCTION_STEP_ENABLE_METRICBEAT;
        }
      }
      else if (activeStep === INSTRUCTION_STEP_ENABLE_METRICBEAT) {
        isDisabled = !product.isPartiallyMigrated && !product.isFullyMigrated;
        nextStep = INSTRUCTION_STEP_DISABLE_INTERNAL;
      }

      return (
        <EuiButton
          type="submit"
          fill
          iconType="sortRight"
          iconSide="right"
          isDisabled={isDisabled}
          onClick={() => this.setState({ activeStep: nextStep })}
        >
          {i18n.translate('xpack.monitoring.metricbeat_migration.flyout.nextButtonLabel', {
            defaultMessage: 'Next'
          })}
        </EuiButton>
      );
    }

    return (
      <EuiButton
        type="submit"
        fill
        isDisabled={!product.isFullyMigrated}
        onClick={this.props.onClose}
      >
        {i18n.translate('xpack.monitoring.metricbeat_migration.flyout.doneButtonLabel', {
          defaultMessage: 'Done'
        })}
      </EuiButton>
    );
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
              {i18n.translate('xpack.monitoring.metricbeat_migration.flyout.flyoutTitle', {
                defaultMessage: 'Migrate to Metricbeat'
              })}
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
                {i18n.translate('xpack.monitoring.metricbeat_migration.flyout.closeButtonLabel', {
                  defaultMessage: 'Close'
                })}
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
