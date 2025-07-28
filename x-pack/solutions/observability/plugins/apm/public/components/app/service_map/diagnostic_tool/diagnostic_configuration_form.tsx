/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect } from 'react';
import type { EuiSelectOption } from '@elastic/eui';
import {
  EuiPanel,
  EuiTitle,
  EuiText,
  EuiFormRow,
  EuiSelect,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSteps,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { isEmpty } from 'lodash';
import { SuggestionsSelect } from '../../../shared/suggestions_select';
import { useAnyOfApmParams } from '../../../../hooks/use_apm_params';
import { useTimeRange } from '../../../../hooks/use_time_range';
import {
  SERVICE_NAME,
  SPAN_DESTINATION_SERVICE_RESOURCE,
} from '../../../../../common/es_fields/apm';
import type { DiagnosticFormState, NodeField } from './types';

interface DiagnosticConfigurationFormProps {
  selectedNode: cytoscape.NodeSingular | cytoscape.EdgeSingular | undefined;
  onSelectionUpdate: (params: DiagnosticFormState) => void;
}

export function DiagnosticConfigurationForm({
  selectedNode,
  onSelectionUpdate,
}: DiagnosticConfigurationFormProps) {
  const {
    query: { rangeFrom, rangeTo },
  } = useAnyOfApmParams(
    '/services/{serviceName}/service-map',
    '/service-map',
    '/mobile-services/{serviceName}/service-map'
  );
  const { start, end } = useTimeRange({ rangeFrom, rangeTo });
  const [traceId, setTraceId] = useState('');

  const [selectedFields, setSelectedFields] = useState<string[]>([
    SERVICE_NAME,
    SPAN_DESTINATION_SERVICE_RESOURCE,
  ]);
  const [selectedValues, setSelectedValues] = useState<string[]>(['', '']);

  const updateArrayAtIndex = <T,>(array: T[], index: number, value: T): T[] => {
    return array.map((item, i) => (i === index ? value : item));
  };

  useEffect(() => {
    const [sourceNodeField, destinationNodeField] = selectedFields;
    const [sourceNodeValue, destinationNodeValue] = selectedValues;
    const sourceNode =
      sourceNodeField && sourceNodeValue
        ? { field: sourceNodeField as NodeField, value: sourceNodeValue }
        : null;

    const destinationNode =
      destinationNodeField && destinationNodeValue
        ? { field: destinationNodeField as NodeField, value: destinationNodeValue }
        : null;

    onSelectionUpdate({
      sourceNode,
      destinationNode,
      traceId,
      isValid: !isEmpty(sourceNodeValue) && !isEmpty(destinationNodeValue) && !isEmpty(traceId),
    });
  }, [selectedFields, selectedValues, traceId, onSelectionUpdate]);

  const onChangeField = (fieldName: string, index: number) => {
    setSelectedFields((prev) => updateArrayAtIndex(prev, index, fieldName));
    setSelectedValues((prev) => updateArrayAtIndex(prev, index, ''));
  };

  const onChangeValue = (value: string, index: number) => {
    setSelectedValues((prev) => updateArrayAtIndex(prev, index, value));
  };

  const fieldOptions: EuiSelectOption[] = [
    { value: SERVICE_NAME, text: SERVICE_NAME },
    { value: SPAN_DESTINATION_SERVICE_RESOURCE, text: SPAN_DESTINATION_SERVICE_RESOURCE },
  ];

  const steps = [
    {
      title: 'Configure Missing Nodes',
      children: (
        <div>
          <EuiText size="s" color="subdued">
            {i18n.translate('xpack.apm.serviceMap.diagnoseMissingConnection.description', {
              defaultMessage:
                'Specify the source service and destination node you expect to see connected in the service map.',
            })}
          </EuiText>
          <EuiSpacer size="m" />
          {selectedFields.map((fieldName, idx) => {
            const filterId = `filter-${idx}`;
            return (
              <React.Fragment key={filterId}>
                <EuiFormRow
                  label={
                    idx === 0
                      ? i18n.translate(
                          'xpack.apm.serviceMap.diagnoseMissingConnection.sourceNodeLabel',
                          {
                            defaultMessage: 'Source node',
                          }
                        )
                      : i18n.translate(
                          'xpack.apm.serviceMap.diagnoseMissingConnection.destinationNodeLabel',
                          {
                            defaultMessage: 'Destination node',
                          }
                        )
                  }
                  fullWidth
                >
                  <EuiFlexGroup gutterSize="s" alignItems="center">
                    <EuiFlexItem>
                      <EuiSelect
                        aria-label={i18n.translate(
                          'xpack.apm.settings.customLink.flyout.filters.ariaLabel',
                          {
                            defaultMessage: 'Choose a field',
                          }
                        )}
                        data-test-subj={filterId}
                        id={filterId}
                        fullWidth
                        options={fieldOptions}
                        value={fieldName}
                        prepend={i18n.translate(
                          'xpack.apm.settings.customLink.flyout.filters.prepend',
                          {
                            defaultMessage: 'Field',
                          }
                        )}
                        onChange={(e) => {
                          onChangeField(e.target.value, idx);
                        }}
                        isInvalid={!isEmpty(selectedValues[idx]) && isEmpty(fieldName)}
                      />
                    </EuiFlexItem>
                    <EuiFlexItem>
                      <SuggestionsSelect
                        key={`${filterId}-${fieldName}`} // Include fieldName in key to force re-render when field changes
                        dataTestSubj={`${fieldName}.value`}
                        fieldName={fieldName}
                        placeholder={i18n.translate(
                          'xpack.apm.settings.customLink.flyOut.filters.defaultOption.value',
                          { defaultMessage: 'Value' }
                        )}
                        defaultValue={selectedValues[idx]}
                        onChange={(selectedValue) => onChangeValue(selectedValue as string, idx)}
                        isInvalid={!isEmpty(fieldName) && isEmpty(selectedValues[idx])}
                        start={start}
                        end={end}
                      />
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiFormRow>
                <EuiSpacer size="s" />
              </React.Fragment>
            );
          })}
        </div>
      ),
    },
    {
      title: 'Provide Trace Information',
      children: (
        <>
          <EuiText size="s" color="subdued">
            {i18n.translate('xpack.apm.serviceMap.diagnoseMissingConnection.description', {
              defaultMessage:
                'Enter a trace ID that you expect to contain a connection between the selected source and destination nodes. This will help analyze if the trace properly flows through both services.',
            })}
          </EuiText>
          <EuiSpacer size="m" />
          <EuiFormRow
            label={i18n.translate('xpack.apm.serviceMap.diagnoseMissingConnection.traceIdLabel', {
              defaultMessage: 'Trace ID',
            })}
            fullWidth
          >
            <SuggestionsSelect
              fieldName="trace.id"
              onChange={(value) => setTraceId(value)}
              isInvalid={isEmpty(traceId)}
              placeholder={i18n.translate(
                'xpack.apm.serviceMap.diagnoseMissingConnection.traceIdPlaceholder',
                {
                  defaultMessage: 'Enter Trace ID',
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
