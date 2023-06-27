/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiButton,
  EuiCard,
  EuiIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFilePicker,
  EuiCallOut,
  EuiSpacer,
} from '@elastic/eui';
import { APIReturnType } from '../../../services/rest/create_call_apm_api';
import { useDiagnosticsContext } from './context/use_diagnostics';
import { getIndexTemplateStatus } from './summary_tab/index_templates_status';
import { getIndicesTabStatus } from './summary_tab/indicies_status';
import { getDataStreamTabStatus } from './summary_tab/data_streams_status';

type DiagnosticsBundle = APIReturnType<'GET /internal/apm/diagnostics'>;

export function DiagnosticsImportExport() {
  return (
    <EuiFlexGroup gutterSize="l">
      <EuiFlexItem>
        <ExportCard />
      </EuiFlexItem>
      <EuiFlexItem>
        <ImportCard />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

function ExportCard() {
  const { diagnosticsBundle, isImported } = useDiagnosticsContext();

  return (
    <EuiCard
      isDisabled={isImported}
      icon={<EuiIcon size="xxl" type="importAction" />}
      title="Export"
      description="Export the diagnostics report in order to provide it to Elastic Support"
      footer={
        <div>
          <EuiButton
            isDisabled={isImported}
            data-test-subj="apmDiagnosticsImportExportGoForItButton"
            aria-label="Export diagnostics report"
            onClick={() => {
              if (!diagnosticsBundle) {
                return;
              }

              const blob = new Blob(
                [JSON.stringify(diagnosticsBundle, null, 2)],
                {
                  type: 'text/plain',
                }
              );
              const fileURL = URL.createObjectURL(blob);

              const { kibanaVersion } = diagnosticsBundle;
              const link = document.createElement('a');
              link.href = fileURL;
              link.download = `apm-diagnostics-${kibanaVersion}-${Date.now()}.json`;
              link.click();
            }}
          >
            Export
          </EuiButton>
        </div>
      }
    />
  );
}

function ImportCard() {
  const { setImportedDiagnosticsBundle, isImported } = useDiagnosticsContext();
  const [importError, setImportError] = useState(false);
  return (
    <EuiCard
      icon={<EuiIcon size="xxl" type="exportAction" />}
      title="Import diagnostics report"
      description={
        isImported
          ? 'Diagnostics report was imported'
          : `Import a diagnostics report in order to view the results in the UI`
      }
      footer={
        <div>
          {isImported ? (
            <EuiButton
              data-test-subj="apmImportCardRemoveReportButton"
              onClick={() => setImportedDiagnosticsBundle(undefined)}
              color="danger"
            >
              Remove report
            </EuiButton>
          ) : (
            <>
              {importError && (
                <>
                  <EuiCallOut color="danger" iconType="warning">
                    The uploaded file could not be parsed
                  </EuiCallOut>
                  <EuiSpacer />
                </>
              )}
              <EuiFilePicker
                fullWidth
                id="file-picker"
                multiple
                onChange={(_files) => {
                  setImportError(false);

                  if (_files && _files.length > 0) {
                    const file = Array.from(_files)[0];
                    const reader = new FileReader();
                    reader.onload = (evt: ProgressEvent<FileReader>) => {
                      try {
                        const diagnosticsBundle = JSON.parse(
                          // @ts-expect-error
                          evt?.target?.result
                        ) as DiagnosticsBundle;

                        if (isBundleValid(diagnosticsBundle)) {
                          setImportedDiagnosticsBundle(diagnosticsBundle);
                        } else {
                          setImportError(true);
                        }
                      } catch (e) {
                        setImportError(true);
                        console.error(
                          `Could not parse file ${file.name}. ${e.message}`
                        );
                      }
                    };

                    reader.readAsText(file);
                  }
                }}
              />
            </>
          )}
        </div>
      }
    />
  );
}

function isBundleValid(diagnosticsBundle: DiagnosticsBundle) {
  try {
    getIndexTemplateStatus(diagnosticsBundle);
    getIndicesTabStatus(diagnosticsBundle);
    getDataStreamTabStatus(diagnosticsBundle);
    return true;
  } catch (e) {
    return false;
  }
}
