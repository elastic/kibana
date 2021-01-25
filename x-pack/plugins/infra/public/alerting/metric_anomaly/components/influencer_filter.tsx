/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import React, { useCallback, useEffect, useMemo } from 'react';
import { first } from 'lodash';
import { EuiFlexGroup, EuiFlexItem, EuiSelect, EuiFieldSearch } from '@elastic/eui';
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
  const onUpdateFieldValue = useCallback((e) => onChangeFieldValue(e.target.value), [
    onChangeFieldValue,
  ]);

  return (
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
          value={fieldValue}
          onChange={onUpdateFieldValue}
          placeholder={i18n.translate(
            'xpack.infra.metrics.alertFlyout.anomalyInfluencerFilterPlaceholder',
            {
              defaultMessage: '(Any)',
            }
          )}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
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
