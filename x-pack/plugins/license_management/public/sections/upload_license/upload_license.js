/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { BASE_PATH } from '../../../common/constants';
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
  EuiPanel
} from '@elastic/eui';

export class UploadLicense extends React.PureComponent {
  send = acknowledge => {
    const file = this.file;
    const fr = new FileReader();
    fr.onload = ({ target: { result } }) => {
      this.props.uploadLicense(
        result,
        this.props.currentLicenseType,
        acknowledge
      );
    };
    fr.readAsText(file);
  };

  cancel = () => {
    this.props.uploadLicenseStatus({});
  };

  acknowledgeModal() {
    const {
      needsAcknowledgement,
      messages: [firstLine, ...messages] = []
    } = this.props;
    if (!needsAcknowledgement) {
      return null;
    }
    return (
      <EuiOverlayMask>
        <EuiConfirmModal
          title="Confirm License Upload"
          onCancel={this.cancel}
          onConfirm={() => this.send(true)}
          cancelButtonText="Cancel"
          confirmButtonText="Confirm"
        >
          <div>
            <EuiText>{firstLine}</EuiText>
            <EuiText>
              <ul>
                {messages.map(message => <li key={message}>{message}</li>)}
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
  submit = event => {
    event.preventDefault();
    if (this.file) {
      this.send();
    } else {
      this.props.addUploadErrorMessage('You must select a license file.');
    }
  };

  render() {
    const { currentLicenseType, applying } = this.props;
    return (
      <div className="licenseManagement__contain">
        <EuiFlexGroup justifyContent="spaceAround">
          <EuiFlexItem grow={false}>
            <EuiTitle size="l">
              <h1>Upload your license</h1>
            </EuiTitle>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer />
        <EuiPanel>
          {this.acknowledgeModal()}

          <EuiText>
            Your license key is a JSON file with a signature attached.
          </EuiText>
          <EuiText>
            Uploading a license will replace your current{' '}
            <strong>{currentLicenseType.toUpperCase()}</strong> license.
          </EuiText>
          <EuiSpacer />
          <EuiForm
            isInvalid={!!this.errorMessage()}
            error={this.errorMessage()}
          >
            <EuiText>
              <EuiFilePicker
                id="licenseFile"
                initialPromptText="Select or drag your license file"
                onChange={this.handleFile}
              />
            </EuiText>
            <EuiSpacer size="m" />
            <EuiFlexGroup justifyContent="spaceBetween">
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty href={`#${BASE_PATH}home`}>
                  Cancel
                </EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton data-test-subj="uploadLicenseButton" fill isLoading={applying} onClick={this.submit}>
                  {applying ? 'Uploading...' : 'Upload'}
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiForm>
        </EuiPanel>
      </div>
    );
  }
}
