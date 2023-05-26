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
import useSessionStorage from 'react-use/lib/useSessionStorage';
import { callApmApi } from '../../../services/rest/create_call_apm_api';

export type DiagnosticsReport = Awaited<
  ReturnType<typeof getDiagnosticsReport>
>;

async function getDiagnosticsReport() {
  const opts = { signal: null };

  const dataStreamsPromise = callApmApi(
    `GET /internal/apm/diagnostics/data_streams`,
    opts
  );
  const indexPatternSettingsPromise = callApmApi(
    `GET /internal/apm/diagnostics/index_pattern_settings`,
    opts
  );
  const indexTemplatesPromise = callApmApi(
    `GET /internal/apm/diagnostics/index_templates`,
    opts
  );
  const indicesPromise = callApmApi(
    `GET /internal/apm/diagnostics/indices`,
    opts
  );

  const [dataStream, indexPatternSettings, indexTemplates, indicies] =
    await Promise.all([
      dataStreamsPromise,
      indexPatternSettingsPromise,
      indexTemplatesPromise,
      indicesPromise,
    ]);

  return { dataStream, indexPatternSettings, indexTemplates, indicies };
}

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
  return (
    <EuiCard
      icon={<EuiIcon size="xxl" type="importAction" />}
      title="Download"
      description="Download the diagnostics report in order to provide it to Elastic Support"
      footer={
        <div>
          <EuiButton
            data-test-subj="apmDiagnosticsImportExportGoForItButton"
            aria-label="Download diagnostics report"
            onClick={() => {
              getDiagnosticsReport().then((diagnosticsReport) => {
                const blob = new Blob(
                  [JSON.stringify(diagnosticsReport, null, 2)],
                  {
                    type: 'text/plain',
                  }
                );
                const fileURL = URL.createObjectURL(blob);

                const link = document.createElement('a');
                link.href = fileURL;
                link.download = 'diagnostics.json';
                link.click();
              });
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
  const { report, setReport } = useDiagnosticsReportFromSessionStorage();
  return (
    <EuiCard
      icon={<EuiIcon size="xxl" type="exportAction" />}
      title="Upload diagnostics report"
      description="Upload a diagnostics report in order to view the results in the UI"
      footer={
        <div>
          {report ? (
            <EuiButton
              onClick={() => {
                setReport(undefined);
                location.reload();
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
                      ) as DiagnosticsReport;
                      setReport(content);
                      location.reload();
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

export function useDiagnosticsReportFromSessionStorage() {
  const [report, setReport] = useSessionStorage<DiagnosticsReport | undefined>(
    'diagnostics_report'
  );
  return { report, setReport };
}
