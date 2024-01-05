/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiCallOut,
  EuiForm,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSpacer,
  EuiText,
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
        <EuiText size="s">
          <p>
            <FormattedMessage
              id="xpack.lens.application.csvPanelContent.generationDescription"
              defaultMessage="Download the data displayed in the visualization."
            />
          </p>
          {warnings.map((warning, i) => (
            <p key={i}>{warning}</p>
          ))}
        </EuiText>
      </EuiModalBody>
      <EuiModalFooter>
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
      </EuiModalFooter>
    </>
  );
}
