/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFilePicker,
  EuiForm,
  EuiSpacer,
  EuiConfirmModal,
  EuiOverlayMask,
  EuiText,
  EuiTitle,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPageContent,
  EuiPageContentBody,
} from '@elastic/eui';
import { TelemetryOptIn } from '../../components/telemetry_opt_in';
import { shouldShowTelemetryOptIn } from '../../lib/telemetry';
import { FormattedMessage } from '@kbn/i18n/react';

import { reactRouterNavigate } from '../../../../../../../src/plugins/kibana_react/public';

export class UploadLicense extends React.PureComponent {
  state = {
    isOptingInToTelemetry: false,
  };

  componentDidMount() {
    this.props.setBreadcrumb('upload');
    this.props.addUploadErrorMessage('');
  }
  onOptInChange = (isOptingInToTelemetry) => {
    this.setState({ isOptingInToTelemetry });
  };
  send = (acknowledge) => {
    const file = this.file;
    const fr = new FileReader();

    fr.onload = ({ target: { result } }) => {
      if (this.state.isOptingInToTelemetry) {
        this.props.telemetry?.telemetryService.setOptIn(true);
      }
      this.props.uploadLicense(result, this.props.currentLicenseType, acknowledge);
    };
    fr.readAsText(file);
  };

  cancel = () => {
    this.props.uploadLicenseStatus({});
  };

  acknowledgeModal() {
    const { needsAcknowledgement, messages: [firstLine, ...messages] = [] } = this.props;
    if (!needsAcknowledgement) {
      return null;
    }
    return (
      <EuiOverlayMask>
        <EuiConfirmModal
          title={
            <FormattedMessage
              id="xpack.licenseMgmt.uploadLicense.confirmModalTitle"
              defaultMessage="Confirm License Upload"
            />
          }
          onCancel={this.cancel}
          onConfirm={() => this.send(true)}
          cancelButtonText={
            <FormattedMessage
              id="xpack.licenseMgmt.uploadLicense.confirmModal.cancelButtonLabel"
              defaultMessage="Cancel"
            />
          }
          confirmButtonText={
            <FormattedMessage
              id="xpack.licenseMgmt.uploadLicense.confirmModal.confirmButtonLabel"
              defaultMessage="Confirm"
            />
          }
        >
          <div>
            <EuiText>{firstLine}</EuiText>
            <EuiText>
              <ul>
                {messages.map((message) => (
                  <li key={message}>{message}</li>
                ))}
              </ul>
            </EuiText>
          </div>
        </EuiConfirmModal>
      </EuiOverlayMask>
    );
  }
  errorMessage() {
    const { errorMessage } = this.props;
    if (!errorMessage) {
      return null;
    }
    return [errorMessage];
  }
  handleFile = ([file]) => {
    if (file) {
      this.props.addUploadErrorMessage('');
    }
    this.file = file;
  };
  submit = (event) => {
    event.preventDefault();
    if (this.file) {
      this.send();
    } else {
      this.props.addUploadErrorMessage(
        <FormattedMessage
          id="xpack.licenseMgmt.uploadLicense.licenseFileNotSelectedErrorMessage"
          defaultMessage="You must select a license file."
        />
      );
    }
  };
  render() {
    const { currentLicenseType, applying, telemetry, history } = this.props;

    return (
      <Fragment>
        <EuiPageContent horizontalPosition="center" verticalPosition="center">
          <EuiPageContentBody>
            <EuiTitle size="m">
              <h1>
                <FormattedMessage
                  id="xpack.licenseMgmt.uploadLicense.uploadLicenseTitle"
                  defaultMessage="Upload your license"
                />
              </h1>
            </EuiTitle>

            <EuiSpacer />

            {this.acknowledgeModal()}

            <EuiText>
              <p>
                <FormattedMessage
                  id="xpack.licenseMgmt.uploadLicense.licenseKeyTypeDescription"
                  defaultMessage="Your license key is a JSON file with a signature attached."
                />
              </p>
              <p>
                <FormattedMessage
                  id="xpack.licenseMgmt.uploadLicense.replacingCurrentLicenseWarningMessage"
                  defaultMessage="Uploading a license will replace your current {currentLicenseType} license."
                  values={{
                    currentLicenseType: <strong>{currentLicenseType.toUpperCase()}</strong>,
                  }}
                />
              </p>
            </EuiText>
            <EuiSpacer />
            <EuiForm isInvalid={!!this.errorMessage()} error={this.errorMessage()}>
              <EuiFlexGroup justifyContent="center">
                <EuiFlexItem grow={false}>
                  <EuiText>
                    <EuiFilePicker
                      id="licenseFile"
                      initialPromptText={
                        <FormattedMessage
                          id="xpack.licenseMgmt.uploadLicense.selectLicenseFileDescription"
                          defaultMessage="Select or drag your license file"
                        />
                      }
                      onChange={this.handleFile}
                    />
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
              <EuiSpacer size="m" />
              {shouldShowTelemetryOptIn(telemetry) && (
                <TelemetryOptIn
                  isOptingInToTelemetry={this.state.isOptingInToTelemetry}
                  onOptInChange={this.onOptInChange}
                  telemetry={telemetry}
                />
              )}
              <EuiSpacer size="m" />
              <EuiFlexGroup justifyContent="spaceBetween">
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty {...reactRouterNavigate(history, '/home')}>
                    <FormattedMessage
                      id="xpack.licenseMgmt.uploadLicense.cancelButtonLabel"
                      defaultMessage="Cancel"
                    />
                  </EuiButtonEmpty>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButton
                    data-test-subj="uploadLicenseButton"
                    fill
                    isLoading={applying}
                    onClick={this.submit}
                  >
                    {applying ? (
                      <FormattedMessage
                        id="xpack.licenseMgmt.uploadLicense.uploadingButtonLabel"
                        defaultMessage="Uploading…"
                      />
                    ) : (
                      <FormattedMessage
                        id="xpack.licenseMgmt.uploadLicense.uploadButtonLabel"
                        defaultMessage="Upload"
                      />
                    )}
                  </EuiButton>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiForm>
          </EuiPageContentBody>
        </EuiPageContent>
      </Fragment>
    );
  }
}
