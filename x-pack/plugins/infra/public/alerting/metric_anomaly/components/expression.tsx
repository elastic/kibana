/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiLoadingContent, EuiSpacer, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { euiStyled, EuiThemeProvider } from '../../../../../../../src/plugins/kibana_react/common';
import {
  RuleTypeParams,
  RuleTypeParamsExpressionProps,
  WhenExpression,
} from '../../../../../triggers_actions_ui/public';
import { MetricAnomalyParams } from '../../../../common/alerting/metrics';
import { ANOMALY_THRESHOLD } from '../../../../common/infra_ml';
import { findInventoryModel } from '../../../../common/inventory_models';
import { InventoryItemType, SnapshotMetricType } from '../../../../common/inventory_models/types';
import { SubscriptionSplashPrompt } from '../../../components/subscription_splash_content';
import { useSourceViaHttp } from '../../../containers/metrics_source/use_source_via_http';
import { useInfraMLCapabilities } from '../../../containers/ml/infra_ml_capabilities';
import { useKibanaContextForPlugin } from '../../../hooks/use_kibana';
import { useActiveKibanaSpace } from '../../../hooks/use_kibana_space';
import { InfraWaffleMapOptions } from '../../../lib/lib';
import { InfluencerFilter } from './influencer_filter';
import { NodeTypeExpression } from './node_type';
import { SeverityThresholdExpression } from './severity_threshold';

export interface AlertContextMeta {
  metric?: InfraWaffleMapOptions['metric'];
  nodeType?: InventoryItemType;
}

type AlertParams = RuleTypeParams &
  MetricAnomalyParams & { sourceId: string; spaceId: string; hasInfraMLCapabilities: boolean };

type Props = Omit<
  RuleTypeParamsExpressionProps<AlertParams, AlertContextMeta>,
  'defaultActionGroupId' | 'actionGroups' | 'charts' | 'data' | 'unifiedSearch'
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

  const { setRuleParams, ruleParams, ruleInterval, metadata } = props;
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
    ruleParams.influencerFilter?.fieldName ?? 'host.name'
  );

  useEffect(() => {
    setRuleParams('hasInfraMLCapabilities', hasInfraMLCapabilities);
  }, [setRuleParams, hasInfraMLCapabilities]);

  useEffect(() => {
    if (ruleParams.influencerFilter) {
      setRuleParams('influencerFilter', {
        ...ruleParams.influencerFilter,
        fieldName: influencerFieldName,
      });
    }
  }, [influencerFieldName, ruleParams, setRuleParams]);
  const updateInfluencerFieldValue = useCallback(
    (value: string) => {
      if (value) {
        setRuleParams('influencerFilter', {
          ...ruleParams.influencerFilter,
          fieldValue: value,
        } as MetricAnomalyParams['influencerFilter']);
      } else {
        setRuleParams('influencerFilter', undefined);
      }
    },
    [setRuleParams, ruleParams]
  );

  useEffect(() => {
    setRuleParams('alertInterval', ruleInterval);
  }, [setRuleParams, ruleInterval]);

  const updateNodeType = useCallback(
    (nt: any) => {
      setRuleParams('nodeType', nt);
    },
    [setRuleParams]
  );

  const updateMetric = useCallback(
    (metric: string) => {
      setRuleParams('metric', metric as MetricAnomalyParams['metric']);
    },
    [setRuleParams]
  );

  const updateSeverityThreshold = useCallback(
    (threshold: any) => {
      setRuleParams('threshold', threshold);
    },
    [setRuleParams]
  );

  const prefillNodeType = useCallback(() => {
    const md = metadata;
    if (md && md.nodeType) {
      setRuleParams(
        'nodeType',
        getMLNodeTypeFromInventoryNodeType(md.nodeType) ?? defaultExpression.nodeType
      );
    } else {
      setRuleParams('nodeType', defaultExpression.nodeType);
    }
  }, [metadata, setRuleParams]);

  const prefillMetric = useCallback(() => {
    const md = metadata;
    if (md && md.metric) {
      setRuleParams(
        'metric',
        getMLMetricFromInventoryMetric(md.metric.type) ?? defaultExpression.metric
      );
    } else {
      setRuleParams('metric', defaultExpression.metric);
    }
  }, [metadata, setRuleParams]);

  useEffect(() => {
    if (!ruleParams.nodeType) {
      prefillNodeType();
    }

    if (!ruleParams.threshold) {
      setRuleParams('threshold', defaultExpression.threshold);
    }

    if (!ruleParams.metric) {
      prefillMetric();
    }

    if (!ruleParams.sourceId) {
      setRuleParams('sourceId', source?.id || 'default');
    }

    if (!ruleParams.spaceId) {
      setRuleParams('spaceId', space?.id || 'default');
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
            value={ruleParams.nodeType ?? defaultExpression.nodeType}
            onChange={updateNodeType}
          />
        </StyledExpressionRow>
      </StyledExpression>
      <EuiSpacer size={'xs'} />
      <StyledExpressionRow>
        <StyledExpression>
          <WhenExpression
            aggType={ruleParams.metric ?? defaultExpression.metric}
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
            value={ruleParams.threshold ?? ANOMALY_THRESHOLD.CRITICAL}
            onChange={updateSeverityThreshold}
          />
        </StyledExpression>
      </StyledExpressionRow>
      <EuiSpacer size={'m'} />
      <InfluencerFilter
        derivedIndexPattern={derivedIndexPattern}
        nodeType={ruleParams.nodeType}
        fieldName={influencerFieldName}
        fieldValue={ruleParams.influencerFilter?.fieldValue ?? ''}
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
