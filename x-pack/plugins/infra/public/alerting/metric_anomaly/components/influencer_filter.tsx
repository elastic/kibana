/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { debounce } from 'lodash';
import { i18n } from '@kbn/i18n';
import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { first } from 'lodash';
import { EuiFlexGroup, EuiFormRow, EuiCheckbox, EuiFlexItem, EuiSelect } from '@elastic/eui';
import {
  MetricsExplorerKueryBar,
  CurryLoadSuggestionsType,
} from '../../../pages/metrics/metrics_explorer/components/kuery_bar';
import { MetricAnomalyParams } from '../../../../common/alerting/metrics';

interface Props {
  fieldName: string;
  fieldValue: string;
  nodeType: MetricAnomalyParams['nodeType'];
  onChangeFieldName: (v: string) => void;
  onChangeFieldValue: (v: string) => void;
  derivedIndexPattern: Parameters<typeof MetricsExplorerKueryBar>[0]['derivedIndexPattern'];
}

const FILTER_TYPING_DEBOUNCE_MS = 500;

export const InfluencerFilter = ({
  fieldName,
  fieldValue,
  nodeType,
  onChangeFieldName,
  onChangeFieldValue,
  derivedIndexPattern,
}: Props) => {
  const fieldNameOptions = useMemo(
    () => (nodeType === 'k8s' ? k8sFieldNames : hostFieldNames),
    [nodeType]
  );

  // If initial props contain a fieldValue, assume it was passed in from loaded alertParams,
  // and enable the UI element
  const [isEnabled, updateIsEnabled] = useState(fieldValue ? true : false);
  const [storedFieldValue, updateStoredFieldValue] = useState(fieldValue);

  useEffect(
    () =>
      nodeType === 'k8s'
        ? onChangeFieldName(first(k8sFieldNames)!.value)
        : onChangeFieldName(first(hostFieldNames)!.value),
    [nodeType, onChangeFieldName]
  );

  const onSelectFieldName = useCallback(
    (e) => onChangeFieldName(e.target.value),
    [onChangeFieldName]
  );
  const onUpdateFieldValue = useCallback(
    (value) => {
      updateStoredFieldValue(value);
      onChangeFieldValue(value);
    },
    [onChangeFieldValue]
  );

  const toggleEnabled = useCallback(() => {
    const nextState = !isEnabled;
    updateIsEnabled(nextState);
    if (!nextState) {
      onChangeFieldValue('');
    } else {
      onChangeFieldValue(storedFieldValue);
    }
  }, [isEnabled, updateIsEnabled, onChangeFieldValue, storedFieldValue]);

  /* eslint-disable-next-line react-hooks/exhaustive-deps */
  const debouncedOnUpdateFieldValue = useCallback(
    debounce(onUpdateFieldValue, FILTER_TYPING_DEBOUNCE_MS),
    [onUpdateFieldValue]
  );

  const affixFieldNameToQuery: CurryLoadSuggestionsType =
    (fn) => (expression, cursorPosition, maxSuggestions) => {
      // Add the field name to the front of the passed-in query
      const prefix = `${fieldName}:`;
      // Trim whitespace to prevent AND/OR suggestions
      const modifiedExpression = `${prefix}${expression}`.trim();
      // Move the cursor position forward by the length of the field name
      const modifiedPosition = cursorPosition + prefix.length;
      return fn(modifiedExpression, modifiedPosition, maxSuggestions, (suggestions) =>
        suggestions
          .map((s) => ({
            ...s,
            // Remove quotes from suggestions
            text: s.text.replace(/\"/g, '').trim(),
            // Offset the returned suggestions' cursor positions so that they can be autocompleted accurately
            start: s.start - prefix.length,
            end: s.end - prefix.length,
          }))
          // Removing quotes can lead to an already-selected suggestion still coming up in the autocomplete list,
          // so filter these out
          .filter((s) => !expression.startsWith(s.text))
      );
    };

  return (
    <EuiFormRow
      label={
        <EuiCheckbox
          label={filterByNodeLabel}
          id="anomalyAlertFilterByNodeCheckbox"
          onChange={toggleEnabled}
          checked={isEnabled}
        />
      }
      helpText={
        isEnabled ? (
          <>
            {i18n.translate('xpack.infra.metrics.alertFlyout.anomalyFilterHelpText', {
              defaultMessage:
                'Limit the scope of your alert trigger to anomalies influenced by certain node(s).',
            })}
            <br />
            {i18n.translate('xpack.infra.metrics.alertFlyout.anomalyFilterHelpTextExample', {
              defaultMessage: 'For example: "my-node-1" or "my-node-*"',
            })}
          </>
        ) : null
      }
      fullWidth
      display="rowCompressed"
    >
      {isEnabled ? (
        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiSelect
              id="selectInfluencerFieldName"
              value={fieldName}
              onChange={onSelectFieldName}
              options={fieldNameOptions}
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <MetricsExplorerKueryBar
              derivedIndexPattern={derivedIndexPattern}
              onChange={debouncedOnUpdateFieldValue}
              onSubmit={onUpdateFieldValue}
              value={storedFieldValue}
              curryLoadSuggestions={affixFieldNameToQuery}
              placeholder={i18n.translate(
                'xpack.infra.metrics.alertFlyout.anomalyInfluencerFilterPlaceholder',
                {
                  defaultMessage: 'Everything',
                }
              )}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      ) : (
        <></>
      )}
    </EuiFormRow>
  );
};

const hostFieldNames = [
  {
    value: 'host.name',
    text: 'host.name',
  },
];

const k8sFieldNames = [
  {
    value: 'kubernetes.pod.uid',
    text: 'kubernetes.pod.uid',
  },
  {
    value: 'kubernetes.node.name',
    text: 'kubernetes.node.name',
  },
  {
    value: 'kubernetes.namespace',
    text: 'kubernetes.namespace',
  },
];

const filterByNodeLabel = i18n.translate('xpack.infra.metrics.alertFlyout.filterByNodeLabel', {
  defaultMessage: 'Filter by node',
});
