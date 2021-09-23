/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState, useMemo, useEffect } from 'react';
import { EuiFlexGroup, EuiSpacer, EuiText, EuiLoadingContent } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import { useInfraMLCapabilities } from '../../../containers/ml/infra_ml_capabilities';
import { SubscriptionSplashPrompt } from '../../../components/subscription_splash_content';
import { MetricAnomalyParams } from '../../../../common/alerting/metrics';
import { euiStyled, EuiThemeProvider } from '../../../../../../../src/plugins/kibana_react/common';
import {
  WhenExpression,
  // eslint-disable-next-line @kbn/eslint/no-restricted-paths
} from '../../../../../triggers_actions_ui/public/common';
import {
  AlertTypeParams,
  AlertTypeParamsExpressionProps,
  // eslint-disable-next-line @kbn/eslint/no-restricted-paths
} from '../../../../../triggers_actions_ui/public/types';
import { useSourceViaHttp } from '../../../containers/metrics_source/use_source_via_http';
import { findInventoryModel } from '../../../../common/inventory_models';
import { InventoryItemType, SnapshotMetricType } from '../../../../common/inventory_models/types';
import { NodeTypeExpression } from './node_type';
import { SeverityThresholdExpression } from './severity_threshold';
import { InfraWaffleMapOptions } from '../../../lib/lib';
import { ANOMALY_THRESHOLD } from '../../../../common/infra_ml';

import { InfluencerFilter } from './influencer_filter';
import { useKibanaContextForPlugin } from '../../../hooks/use_kibana';
import { useActiveKibanaSpace } from '../../../hooks/use_kibana_space';

export interface AlertContextMeta {
  metric?: InfraWaffleMapOptions['metric'];
  nodeType?: InventoryItemType;
}

type AlertParams = AlertTypeParams &
  MetricAnomalyParams & { sourceId: string; spaceId: string; hasInfraMLCapabilities: boolean };

type Props = Omit<
  AlertTypeParamsExpressionProps<AlertParams, AlertContextMeta>,
  'defaultActionGroupId' | 'actionGroups' | 'charts' | 'data'
>;

export const defaultExpression = {
  metric: 'memory_usage' as MetricAnomalyParams['metric'],
  threshold: ANOMALY_THRESHOLD.MAJOR as MetricAnomalyParams['threshold'],
  nodeType: 'hosts' as MetricAnomalyParams['nodeType'],
  influencerFilter: undefined,
};

export const Expression: React.FC<Props> = (props) => {
  const { hasInfraMLCapabilities, isLoading: isLoadingMLCapabilities } = useInfraMLCapabilities();
  const { http, notifications } = useKibanaContextForPlugin().services;
  const { space } = useActiveKibanaSpace();

  const { setAlertParams, alertParams, alertInterval, metadata } = props;
  const { source, createDerivedIndexPattern } = useSourceViaHttp({
    sourceId: 'default',
    fetch: http.fetch,
    toastWarning: notifications.toasts.addWarning,
  });

  const derivedIndexPattern = useMemo(
    () => createDerivedIndexPattern(),
    [createDerivedIndexPattern]
  );

  const [influencerFieldName, updateInfluencerFieldName] = useState(
    alertParams.influencerFilter?.fieldName ?? 'host.name'
  );

  useEffect(() => {
    setAlertParams('hasInfraMLCapabilities', hasInfraMLCapabilities);
  }, [setAlertParams, hasInfraMLCapabilities]);

  useEffect(() => {
    if (alertParams.influencerFilter) {
      setAlertParams('influencerFilter', {
        ...alertParams.influencerFilter,
        fieldName: influencerFieldName,
      });
    }
  }, [influencerFieldName, alertParams, setAlertParams]);
  const updateInfluencerFieldValue = useCallback(
    (value: string) => {
      if (value) {
        setAlertParams('influencerFilter', {
          ...alertParams.influencerFilter,
          fieldValue: value,
        } as MetricAnomalyParams['influencerFilter']);
      } else {
        setAlertParams('influencerFilter', undefined);
      }
    },
    [setAlertParams, alertParams]
  );

  useEffect(() => {
    setAlertParams('alertInterval', alertInterval);
  }, [setAlertParams, alertInterval]);

  const updateNodeType = useCallback(
    (nt: any) => {
      setAlertParams('nodeType', nt);
    },
    [setAlertParams]
  );

  const updateMetric = useCallback(
    (metric: string) => {
      setAlertParams('metric', metric as MetricAnomalyParams['metric']);
    },
    [setAlertParams]
  );

  const updateSeverityThreshold = useCallback(
    (threshold: any) => {
      setAlertParams('threshold', threshold);
    },
    [setAlertParams]
  );

  const prefillNodeType = useCallback(() => {
    const md = metadata;
    if (md && md.nodeType) {
      setAlertParams(
        'nodeType',
        getMLNodeTypeFromInventoryNodeType(md.nodeType) ?? defaultExpression.nodeType
      );
    } else {
      setAlertParams('nodeType', defaultExpression.nodeType);
    }
  }, [metadata, setAlertParams]);

  const prefillMetric = useCallback(() => {
    const md = metadata;
    if (md && md.metric) {
      setAlertParams(
        'metric',
        getMLMetricFromInventoryMetric(md.metric.type) ?? defaultExpression.metric
      );
    } else {
      setAlertParams('metric', defaultExpression.metric);
    }
  }, [metadata, setAlertParams]);

  useEffect(() => {
    if (!alertParams.nodeType) {
      prefillNodeType();
    }

    if (!alertParams.threshold) {
      setAlertParams('threshold', defaultExpression.threshold);
    }

    if (!alertParams.metric) {
      prefillMetric();
    }

    if (!alertParams.sourceId) {
      setAlertParams('sourceId', source?.id || 'default');
    }

    if (!alertParams.spaceId) {
      setAlertParams('spaceId', space?.id || 'default');
    }
  }, [metadata, derivedIndexPattern, defaultExpression, source, space]); // eslint-disable-line react-hooks/exhaustive-deps

  if (isLoadingMLCapabilities) return <EuiLoadingContent lines={10} />;
  if (!hasInfraMLCapabilities) return <SubscriptionSplashPrompt />;

  return (
    // https://github.com/elastic/kibana/issues/89506
    <EuiThemeProvider>
      <EuiText size="xs">
        <h4>
          <FormattedMessage
            id="xpack.infra.metrics.alertFlyout.conditions"
            defaultMessage="Conditions"
          />
        </h4>
      </EuiText>
      <StyledExpression>
        <StyledExpressionRow>
          <NodeTypeExpression
            options={nodeTypes}
            value={alertParams.nodeType ?? defaultExpression.nodeType}
            onChange={updateNodeType}
          />
        </StyledExpressionRow>
      </StyledExpression>
      <EuiSpacer size={'xs'} />
      <StyledExpressionRow>
        <StyledExpression>
          <WhenExpression
            aggType={alertParams.metric ?? defaultExpression.metric}
            onChangeSelectedAggType={updateMetric}
            customAggTypesOptions={{
              memory_usage: {
                text: i18n.translate('xpack.infra.metrics.alertFlyout.anomalyJobs.memoryUsage', {
                  defaultMessage: 'Memory usage',
                }),
                fieldRequired: false,
                value: 'memory_usage',
                validNormalizedTypes: [],
              },
              network_in: {
                text: i18n.translate('xpack.infra.metrics.alertFlyout.anomalyJobs.networkIn', {
                  defaultMessage: 'Network in',
                }),
                fieldRequired: false,
                validNormalizedTypes: [],
                value: 'network_in',
              },
              network_out: {
                text: i18n.translate('xpack.infra.metrics.alertFlyout.anomalyJobs.networkOut', {
                  defaultMessage: 'Network out',
                }),
                fieldRequired: false,
                validNormalizedTypes: [],
                value: 'network_out',
              },
            }}
          />
        </StyledExpression>
        <StyledExpression>
          <SeverityThresholdExpression
            value={alertParams.threshold ?? ANOMALY_THRESHOLD.CRITICAL}
            onChange={updateSeverityThreshold}
          />
        </StyledExpression>
      </StyledExpressionRow>
      <EuiSpacer size={'m'} />
      <InfluencerFilter
        derivedIndexPattern={derivedIndexPattern}
        nodeType={alertParams.nodeType}
        fieldName={influencerFieldName}
        fieldValue={alertParams.influencerFilter?.fieldValue ?? ''}
        onChangeFieldName={updateInfluencerFieldName}
        onChangeFieldValue={updateInfluencerFieldValue}
      />
      <EuiSpacer size={'m'} />
    </EuiThemeProvider>
  );
};

// required for dynamic import
// eslint-disable-next-line import/no-default-export
export default Expression;

const StyledExpressionRow = euiStyled(EuiFlexGroup)`
  display: flex;
  flex-wrap: wrap;
  margin: 0 -4px;
`;

const StyledExpression = euiStyled.div`
  padding: 0 4px;
`;

const getDisplayNameForType = (type: InventoryItemType) => {
  const inventoryModel = findInventoryModel(type);
  return inventoryModel.displayName;
};

export const nodeTypes: { [key: string]: any } = {
  hosts: {
    text: getDisplayNameForType('host'),
    value: 'hosts',
  },
  k8s: {
    text: getDisplayNameForType('pod'),
    value: 'k8s',
  },
};

const getMLMetricFromInventoryMetric: (
  metric: SnapshotMetricType
) => MetricAnomalyParams['metric'] | null = (metric) => {
  switch (metric) {
    case 'memory':
      return 'memory_usage';
    case 'tx':
      return 'network_out';
    case 'rx':
      return 'network_in';
    default:
      return null;
  }
};

const getMLNodeTypeFromInventoryNodeType: (
  nodeType: InventoryItemType
) => MetricAnomalyParams['nodeType'] | null = (nodeType) => {
  switch (nodeType) {
    case 'host':
      return 'hosts';
    case 'pod':
      return 'k8s';
    default:
      return null;
  }
};
