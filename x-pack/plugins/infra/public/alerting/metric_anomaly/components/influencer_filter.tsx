/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { first } from 'lodash';
import {
  EuiFlexGroup,
  EuiFormRow,
  EuiCheckbox,
  EuiFlexItem,
  EuiSelect,
  EuiFieldSearch,
} from '@elastic/eui';
import { MetricAnomalyParams } from '../../../../common/alerting/metrics';

interface Props {
  fieldName: string;
  fieldValue: string;
  nodeType: MetricAnomalyParams['nodeType'];
  onChangeFieldName: (v: string) => void;
  onChangeFieldValue: (v: string) => void;
}

export const InfluencerFilter = ({
  fieldName,
  fieldValue,
  nodeType,
  onChangeFieldName,
  onChangeFieldValue,
}: Props) => {
  const fieldNameOptions = useMemo(() => (nodeType === 'k8s' ? k8sFieldNames : hostFieldNames), [
    nodeType,
  ]);

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

  const onSelectFieldName = useCallback((e) => onChangeFieldName(e.target.value), [
    onChangeFieldName,
  ]);
  const onUpdateFieldValue = useCallback(
    (e) => {
      updateStoredFieldValue(e.target.value);
      onChangeFieldValue(e.target.value);
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
            <EuiFieldSearch
              value={storedFieldValue}
              onChange={onUpdateFieldValue}
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
