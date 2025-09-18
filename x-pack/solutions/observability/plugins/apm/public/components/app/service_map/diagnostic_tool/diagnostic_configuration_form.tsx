/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiPanel,
  EuiTitle,
  EuiText,
  EuiFormRow,
  EuiSpacer,
  EuiFlexItem,
  EuiSteps,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { SuggestionsSelect } from '../../../shared/suggestions_select';
import { useAnyOfApmParams } from '../../../../hooks/use_apm_params';
import { useTimeRange } from '../../../../hooks/use_time_range';
import type { DiagnosticFormState } from './types';

interface DiagnosticConfigurationFormProps {
  onSelectionUpdate: ({
    field,
    value,
  }: {
    field: keyof DiagnosticFormState;
    value?: string;
  }) => void;
  sourceNode?: string;
}

export function DiagnosticConfigurationForm({
  onSelectionUpdate,
  sourceNode,
}: DiagnosticConfigurationFormProps) {
  const {
    query: { rangeFrom, rangeTo },
  } = useAnyOfApmParams(
    '/services/{serviceName}/service-map',
    '/service-map',
    '/mobile-services/{serviceName}/service-map'
  );
  const { start, end } = useTimeRange({ rangeFrom, rangeTo });

  const steps = [
    {
      title: i18n.translate('xpack.apm.serviceMap.diagnoseMissingConnection.title', {
        defaultMessage: 'Configure Missing Nodes',
      }),
      children: (
        <div>
          <EuiText size="s" color="subdued">
            {i18n.translate('xpack.apm.serviceMap.diagnoseMissingConnection.description', {
              defaultMessage:
                'Specify the source and destination services you expect to see connected in the service map.',
            })}
          </EuiText>
          <EuiSpacer size="m" />
          <EuiFormRow
            label={i18n.translate(
              'xpack.apm.serviceMap.diagnoseMissingConnection.sourceNodeLabel',
              {
                defaultMessage: 'Source node',
              }
            )}
            fullWidth
          >
            <EuiFlexItem>
              <SuggestionsSelect
                dataTestSubj="sourceNode.value"
                fieldName={'service.name'}
                placeholder={i18n.translate(
                  'xpack.apm.serviceMap.diagnoseMissingConnection.sourceNodePlaceholder',
                  { defaultMessage: 'Select or type source service name' }
                )}
                onChange={(selectedValue) =>
                  onSelectionUpdate({ field: 'sourceNode', value: selectedValue })
                }
                defaultValue={sourceNode}
                start={start}
                end={end}
              />
            </EuiFlexItem>
          </EuiFormRow>

          <EuiFormRow
            label={i18n.translate(
              'xpack.apm.serviceMap.diagnoseMissingConnection.destinationNodeLabel',
              {
                defaultMessage: 'Destination node',
              }
            )}
            fullWidth
          >
            <EuiFlexItem>
              <SuggestionsSelect
                dataTestSubj={`destinationNode.value`}
                fieldName={'service.name'}
                placeholder={i18n.translate(
                  'xpack.apm.serviceMap.diagnoseMissingConnection.destinationNodePlaceholder',
                  { defaultMessage: 'Select or type destination service name' }
                )}
                onChange={(selectedValue) =>
                  onSelectionUpdate({ field: 'destinationNode', value: selectedValue })
                }
                start={start}
                end={end}
              />
            </EuiFlexItem>
          </EuiFormRow>
        </div>
      ),
    },
    {
      title: i18n.translate('xpack.apm.serviceMap.traceInformation.title', {
        defaultMessage: 'Provide Trace Information',
      }),
      children: (
        <>
          <EuiText size="s" color="subdued">
            {i18n.translate('xpack.apm.serviceMap.traceInformation.description', {
              defaultMessage:
                'Enter a trace ID that is expected to propagate across both the source and destination services',
            })}
          </EuiText>
          <EuiSpacer size="m" />
          <EuiFormRow
            label={i18n.translate('xpack.apm.serviceMap.traceInformation.traceIdLabel', {
              defaultMessage: 'Trace ID',
            })}
            labelAppend={
              <EuiText size="xs" color="subdued">
                <FormattedMessage
                  id="xpack.apm.serviceMap.diagnoseMissingConnection.destinationNodeOptionalLabel"
                  defaultMessage="Optional"
                />
              </EuiText>
            }
          >
            <SuggestionsSelect
              fieldName="trace.id"
              onChange={(value) => onSelectionUpdate({ field: 'traceId', value })}
              placeholder={i18n.translate(
                'xpack.apm.serviceMap.traceInformation.traceIdPlaceholder',
                {
                  defaultMessage: 'Select or type trace ID',
                }
              )}
              start={start}
              end={end}
            />
          </EuiFormRow>
        </>
      ),
    },
  ];

  return (
    <>
      <EuiTitle size="s">
        <h3>
          {i18n.translate('xpack.apm.serviceMap.diagnoseMissingConnection.title', {
            defaultMessage: 'Diagnose a missing connection',
          })}
        </h3>
      </EuiTitle>

      <EuiSpacer size="s" />
      <EuiPanel hasShadow={false} hasBorder={true}>
        <EuiSpacer size="s" />
        <EuiSteps headingElement="h2" steps={steps} />
      </EuiPanel>
    </>
  );
}
