/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSpacer,
} from '@elastic/eui';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';

export interface DownloadPanelContentProps {
  isDisabled: boolean;
  onClick: () => void;
  warnings?: React.ReactNode[];
  onClose: () => void;
}

export function DownloadPanelContent({
  isDisabled,
  onClick,
  warnings = [],
  onClose,
}: DownloadPanelContentProps) {
  return (
    <>
      <EuiModalHeader>
        <EuiModalHeaderTitle>Generate a CSV</EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody className="kbnShareContextMenu__finalPanel" data-test-subj="shareReportingForm">
        <EuiForm>
          <EuiCallOut
            size="s"
            title="CSV reports can take a few minutes to generate based upon the size of your CSV"
            iconType="iInCircle"
          />
        </EuiForm>
        <EuiSpacer size="m" />
      </EuiModalBody>
      <EuiModalFooter>
        <EuiFlexGroup gutterSize="m">
          <EuiFlexItem>
            <EuiButtonEmpty onClick={onClose}>
              <FormattedMessage id="xpack.lens.doneButton" defaultMessage="Done" />
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiButton
              disabled={isDisabled}
              fullWidth
              fill
              onClick={onClick}
              data-test-subj="lnsApp_downloadCSVButton"
              size="s"
            >
              <FormattedMessage
                id="xpack.lens.application.csvPanelContent.downloadButtonLabel"
                defaultMessage="Export as CSV"
              />
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiModalFooter>
    </>
  );
}
