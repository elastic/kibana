/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButton,
  EuiCard,
  EuiIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFilePicker,
} from '@elastic/eui';
import { APIReturnType } from '../../../services/rest/create_call_apm_api';
import { useDiagnosticsContext } from './context/use_diagnostics';

type DiagnosticsBundle = APIReturnType<'GET /internal/apm/diagnostics'>;

export function DiagnosticsImportExport() {
  return (
    <EuiFlexGroup gutterSize="l">
      <EuiFlexItem>
        <DownloadCard />
      </EuiFlexItem>
      <EuiFlexItem>
        <UploadCard />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

function DownloadCard() {
  const { diagnosticsBundle, isUploaded } = useDiagnosticsContext();

  return (
    <EuiCard
      isDisabled={isUploaded}
      icon={<EuiIcon size="xxl" type="importAction" />}
      title="Download"
      description="Download the diagnostics report in order to provide it to Elastic Support"
      footer={
        <div>
          <EuiButton
            isDisabled={isUploaded}
            data-test-subj="apmDiagnosticsImportExportGoForItButton"
            aria-label="Download diagnostics report"
            onClick={() => {
              const blob = new Blob(
                [JSON.stringify(diagnosticsBundle, null, 2)],
                {
                  type: 'text/plain',
                }
              );
              const fileURL = URL.createObjectURL(blob);

              const link = document.createElement('a');
              link.href = fileURL;
              link.download = 'diagnostics.json';
              link.click();
            }}
          >
            Download
          </EuiButton>
        </div>
      }
    />
  );
}

function UploadCard() {
  const { setUploadedDiagnosticsBundle, isUploaded: isUploaded } =
    useDiagnosticsContext();
  return (
    <EuiCard
      icon={<EuiIcon size="xxl" type="exportAction" />}
      title="Upload diagnostics report"
      description="Upload a diagnostics report in order to view the results in the UI"
      footer={
        <div>
          {isUploaded ? (
            <EuiButton
              onClick={() => {
                setUploadedDiagnosticsBundle(undefined);
              }}
              data-test-subj="apmUploadCardRemoveReportButton"
              color="danger"
            >
              Remove report
            </EuiButton>
          ) : (
            <EuiFilePicker
              fullWidth
              id="file-picker"
              multiple
              onChange={(_files) => {
                if (_files && _files.length > 0) {
                  const file = Array.from(_files)[0];
                  const reader = new FileReader();
                  reader.onload = (evt: ProgressEvent<FileReader>) => {
                    try {
                      const content = JSON.parse(
                        // @ts-ignore
                        evt?.target?.result
                      ) as DiagnosticsBundle;
                      setUploadedDiagnosticsBundle(content);
                    } catch (e) {
                      console.error(
                        `Could not parse file ${file.name}. ${e.message}`
                      );
                    }
                  };

                  reader.readAsText(file);
                }
              }}
            />
          )}
        </div>
      }
    />
  );
}
