/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useMemo, useCallback } from 'react';
import moment from 'moment';
import {
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiFlyoutResizable,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiTitle,
  EuiSpacer,
  EuiButton,
  EuiFlexGroup,
  EuiCallOut,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { isEmpty } from 'lodash';
import { downloadJson } from '../../../../utils/download_json';
import { DiagnosticConfigurationForm } from './diagnostic_configuration_form';
import { DiagnosticResults } from './diagnostic_results';
import { useAnyOfApmParams } from '../../../../hooks/use_apm_params';
import { useTimeRange } from '../../../../hooks/use_time_range';
import { callApmApi } from '../../../../services/rest/create_call_apm_api';
import { TechnicalPreviewBadge } from '../../../shared/technical_preview_badge';
import type { DiagnosticFormState } from './types';
import type { ServiceMapDiagnosticResponse } from '../../../../../common/service_map_diagnostic_types';
import { FORBIDDEN_SERVICE_NAMES } from '../../../../../common/service_map/constants';
import type { ServiceMapSelection } from '../popover/popover_content';

interface DiagnosticFlyoutProps {
  onClose: () => void;
  isOpen: boolean;
  /** Selected node or edge from the service map */
  selection: ServiceMapSelection;
}

function checkForForbiddenServiceNames(form: DiagnosticFormState | null): boolean {
  if (!form?.destinationNode || !form.sourceNode) return false;

  if (
    FORBIDDEN_SERVICE_NAMES.includes(form.destinationNode) ||
    FORBIDDEN_SERVICE_NAMES.includes(form.sourceNode)
  ) {
    return true;
  }
  return false;
}

export function DiagnosticFlyout({ onClose, isOpen, selection }: DiagnosticFlyoutProps) {
  const { euiTheme } = useEuiTheme();
  const {
    query: { rangeFrom, rangeTo },
  } = useAnyOfApmParams(
    '/services/{serviceName}/service-map',
    '/service-map',
    '/mobile-services/{serviceName}/service-map'
  );
  const { start, end } = useTimeRange({ rangeFrom, rangeTo });
  const {
    services: { notifications },
  } = useKibana();
  const [data, setData] = useState<ServiceMapDiagnosticResponse>();
  const [isLoading, setIsLoading] = useState(false);

  const [form, setFormState] = useState<DiagnosticFormState>({
    sourceNode: selection.id,
    destinationNode: undefined,
    traceId: undefined,
    isValid: false,
  });

  const handleSelectionUpdate = useCallback(
    ({ field, value }: { field: keyof DiagnosticFormState; value?: string }) => {
      setFormState((prev) => {
        const updated = { ...prev, [field]: value };
        updated.isValid = !!(updated.sourceNode && updated.destinationNode);
        return updated;
      });
      setData(undefined);
    },
    []
  );

  const hasForbiddenNames = useMemo(() => checkForForbiddenServiceNames(form), [form]);

  const handleRunDiagnostic = async () => {
    setIsLoading(true);

    try {
      if (start && end && form.sourceNode && form.destinationNode) {
        const response = await callApmApi('POST /internal/apm/diagnostics/service-map', {
          params: {
            body: {
              start,
              end,
              destinationNode: form.destinationNode,
              sourceNode: form.sourceNode,
              traceId: form.traceId,
            },
          },
          signal: null,
        });

        setData(response);
      } else {
        setIsLoading(false);
      }
    } catch (error) {
      notifications?.toasts.addDanger({
        title: i18n.translate('xpack.apm.diagnosticFlyout.errorTitle', {
          defaultMessage: 'Failed to run diagnostic',
        }),
        text: i18n.translate('xpack.apm.diagnosticFlyout.errorMessage', {
          defaultMessage: 'An error occurred while running the diagnostic. Please try again.',
        }),
      });
      setData(undefined);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const flyoutTitle = i18n.translate('xpack.apm.serviceMap.diagnosticFlyout.title', {
    defaultMessage: 'Diagnostic tool',
  });

  return (
    <EuiFlyoutResizable
      aria-label={flyoutTitle}
      ownFocus
      onClose={onClose}
      size="m"
      maxWidth={1000}
      data-test-subj="diagnosticFlyout"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiFlexGroup justifyContent="flexStart" alignItems="baseline" gutterSize="s">
          <EuiFlexItem>
            <EuiTitle size="m">
              <h2>{flyoutTitle}</h2>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <TechnicalPreviewBadge />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutHeader>
      <EuiFlyoutBody
        style={{
          overflowY: 'auto',
          maxHeight: 'calc(100vh - 200px)',
          padding: euiTheme.size.base,
        }}
      >
        <DiagnosticConfigurationForm
          sourceNode={form.sourceNode}
          onSelectionUpdate={handleSelectionUpdate}
        />
        <EuiSpacer size="m" />

        {hasForbiddenNames && (
          <EuiCallOut
            announceOnMount
            title={i18n.translate(
              'xpack.apm.serviceMap.diagnosticFlyout.forbiddenServiceNamesTitle',
              {
                defaultMessage: 'Reserved service names detected',
              }
            )}
            color="warning"
            iconType="warning"
          >
            <p>
              {i18n.translate(
                'xpack.apm.serviceMap.diagnosticFlyout.forbiddenServiceNamesMessage',
                {
                  defaultMessage:
                    'The following reserved words cannot be used in the service map: {forbiddenNames}. These are reserved keywords that may cause issues with service map functionality.',
                  values: {
                    forbiddenNames: FORBIDDEN_SERVICE_NAMES.map((name) => `"${name}"`).join(', '),
                  },
                }
              )}
            </p>
            <p>
              <strong>
                {i18n.translate(
                  'xpack.apm.serviceMap.diagnosticFlyout.forbiddenServiceNamesSolution',
                  {
                    defaultMessage:
                      'Solution: Please use different service names that do not contain these reserved words.',
                  }
                )}
              </strong>
            </p>
          </EuiCallOut>
        )}

        {isLoading ? (
          <EuiLoadingSpinner size="xl" />
        ) : data ? (
          <DiagnosticResults
            data={data}
            sourceNode={form?.sourceNode}
            destinationNode={form?.destinationNode}
            traceId={form?.traceId}
          />
        ) : null}
        <EuiSpacer size="m" />
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="flexEnd" gutterSize="m">
          <EuiButton
            disabled={!form.isValid || isLoading}
            data-test-subj="apmDiagnosticRunButton"
            onClick={handleRunDiagnostic}
          >
            {i18n.translate('xpack.apm.diagnosticFlyout.closeButtonLabel', {
              defaultMessage: 'Run diagnostic',
            })}
          </EuiButton>
          <EuiButton
            data-test-subj="diagnosticFlyoutDownloadReportButton"
            iconType="download"
            isDisabled={!form.isValid || isLoading || isEmpty(data)}
            onClick={() =>
              downloadJson({
                fileName: `diagnostic-tool-apm-service-map-${moment(Date.now()).format(
                  'YYYYMMDDHHmmss'
                )}.json`,
                data: {
                  filters: {
                    rangeFrom,
                    rangeTo,
                    sourceNode: form.sourceNode,
                    destinationNode: form.destinationNode,
                    traceId: form.traceId,
                  },
                  analysis: data?.analysis,
                  elasticsearchResponses: data?.elasticsearchResponses,
                },
              })
            }
            fill
          >
            {i18n.translate('xpack.apm.storageExplorer.downloadReport', {
              defaultMessage: 'Download report',
            })}
          </EuiButton>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyoutResizable>
  );
}
