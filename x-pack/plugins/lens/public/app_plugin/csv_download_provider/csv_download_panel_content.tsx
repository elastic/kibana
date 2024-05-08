/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiForm, EuiModalFooter, EuiSpacer, EuiText } from '@elastic/eui';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';

export interface DownloadPanelContentProps {
  isDisabled: boolean;
  onClick: () => void;
  warnings?: React.ReactNode[];
}

export function DownloadPanelContent({
  isDisabled,
  onClick,
  warnings = [],
}: DownloadPanelContentProps) {
  return (
    <>
      <EuiForm className="kbnShareContextMenu__finalPanel" data-test-subj="shareReportingForm">
        <EuiText size="s">
          <FormattedMessage
            id="xpack.lens.application.csvPanelContent.generationDescription"
            defaultMessage="Download the data displayed in the visualization."
          />
          {warnings.map((warning, i) => (
            <p key={i}>{warning}</p>
          ))}
        </EuiText>
        <EuiSpacer size="m" />
      </EuiForm>
      <EuiModalFooter>
        <EuiButton
          disabled={isDisabled}
          fill
          onClick={onClick}
          data-test-subj="lnsApp_downloadCSVButton"
        >
          <FormattedMessage
            id="xpack.lens.application.csvPanelContent.downloadButtonLabel"
            defaultMessage="Generate CSV"
          />
        </EuiButton>
      </EuiModalFooter>
    </>
  );
}
