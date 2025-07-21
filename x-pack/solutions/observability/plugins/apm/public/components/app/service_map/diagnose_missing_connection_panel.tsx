/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
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
import { SuggestionsSelect } from '../../shared/suggestions_select';
import { useAnyOfApmParams } from '../../../hooks/use_apm_params';
import { useTimeRange } from '../../../hooks/use_time_range';

interface DiagnoseMissingConnectionPanelProps {
  onRunDiagnostic: (traceId: string, service: string, dependencyService: string) => void;
  selectedNode: cytoscape.NodeSingular | cytoscape.EdgeSingular | undefined;
}

export function DiagnoseMissingConnectionPanel({
  onRunDiagnostic,
  selectedNode,
}: DiagnoseMissingConnectionPanelProps) {
  const {
    query: { rangeFrom, rangeTo },
  } = useAnyOfApmParams(
    '/services/{serviceName}/service-map',
    '/service-map',
    '/mobile-services/{serviceName}/service-map'
  );
  const { start, end } = useTimeRange({ rangeFrom, rangeTo });
  const [traceId, setTraceId] = useState('');
  const [selectedService, setSelectedService] = useState('');
  const [selectedDependency, setSelectedDependency] = useState('');

  // State for managing dropdown field selections and values
  const [selectedFields, setSelectedFields] = useState<string[]>([
    'service.name',
    'span.destination.service.resource',
  ]);
  const [selectedValues, setSelectedValues] = useState<string[]>(['', '']);

  const handleRunDiagnostic = () => {
    onRunDiagnostic(traceId, selectedService, selectedDependency);
  };

  const onChangeField = (fieldName: string, index: number) => {
    const newSelectedFields = [...selectedFields];
    newSelectedFields[index] = fieldName;
    setSelectedFields(newSelectedFields);

    // Reset the value when field changes to trigger new suggestions
    const newSelectedValues = [...selectedValues];
    newSelectedValues[index] = '';
    setSelectedValues(newSelectedValues);
  };

  const onChangeValue = (value: string, index: number) => {
    const newSelectedValues = [...selectedValues];
    newSelectedValues[index] = value;
    setSelectedValues(newSelectedValues);

    // Update the appropriate state based on index
    if (index === 0) {
      setSelectedService(value);
    } else {
      setSelectedDependency(value);
    }
  };

  const isRunDisabled = !traceId && !selectedService && !selectedDependency;

  const fieldOptions: EuiSelectOption[] = [
    { value: 'service.name', text: 'service.name' },
    { value: 'span.destination.service.resource', text: 'span.destination.service.resource' },
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
              defaultMessage: 'Enter a trace ID',
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
