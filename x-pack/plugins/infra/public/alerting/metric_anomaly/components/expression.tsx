/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { debounce, pick } from 'lodash';
import React, { useCallback, useMemo, useEffect, ChangeEvent } from 'react';
import { EuiFlexGroup, EuiSpacer, EuiText, EuiFormRow, EuiFieldSearch } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import { AlertPreview } from '../../common';
import {
  METRIC_ANOMALY_ALERT_TYPE_ID,
  MetricAnomalyParams,
} from '../../../../common/alerting/metrics';
import { euiStyled } from '../../../../../observability/public';
import {
  WhenExpression,
  // eslint-disable-next-line @kbn/eslint/no-restricted-paths
} from '../../../../../triggers_actions_ui/public/common';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { IErrorObject } from '../../../../../triggers_actions_ui/public/types';
import { MetricsExplorerKueryBar } from '../../../pages/metrics/metrics_explorer/components/kuery_bar';
import { useSourceViaHttp } from '../../../containers/source/use_source_via_http';
import { findInventoryModel } from '../../../../common/inventory_models';
import { InventoryItemType, SnapshotMetricType } from '../../../../common/inventory_models/types';
import { NodeTypeExpression } from './node_type';
import { SeverityThresholdExpression } from './severity_threshold';
import { InfraWaffleMapOptions } from '../../../lib/lib';
import { convertKueryToElasticSearchQuery } from '../../../utils/kuery';
import { ANOMALY_THRESHOLD } from '../../../../common/infra_ml';

import { validateMetricAnomaly } from './validation';
import { useKibanaContextForPlugin } from '../../../hooks/use_kibana';

const FILTER_TYPING_DEBOUNCE_MS = 500;

export interface AlertContextMeta {
  options?: Partial<InfraWaffleMapOptions>;
  nodeType?: InventoryItemType;
  filter?: string;
}

interface Props {
  errors: IErrorObject[];
  alertParams: MetricAnomalyParams & {
    filterQueryText?: string;
    sourceId: string;
  };
  alertInterval: string;
  alertThrottle: string;
  setAlertParams(key: string, value: any): void;
  setAlertProperty(key: string, value: any): void;
  metadata: AlertContextMeta;
}

export const defaultExpression = {
  metric: 'memory_usage' as MetricAnomalyParams['metric'],
  threshold: ANOMALY_THRESHOLD.MAJOR,
  nodeType: 'host',
};

export const Expression: React.FC<Props> = (props) => {
  const { http, notifications } = useKibanaContextForPlugin().services;
  const { setAlertParams, alertParams, alertInterval, alertThrottle, metadata } = props;
  const { source, createDerivedIndexPattern } = useSourceViaHttp({
    sourceId: 'default',
    type: 'metrics',
    fetch: http.fetch,
    toastWarning: notifications.toasts.addWarning,
  });

  const derivedIndexPattern = useMemo(() => createDerivedIndexPattern('metrics'), [
    createDerivedIndexPattern,
  ]);

  const onFilterChange = useCallback(
    (filter: any) => {
      setAlertParams('filterQueryText', filter || '');
      setAlertParams(
        'filterQuery',
        convertKueryToElasticSearchQuery(filter, derivedIndexPattern) || ''
      );
    },
    [derivedIndexPattern, setAlertParams]
  );

  /* eslint-disable-next-line react-hooks/exhaustive-deps */
  const debouncedOnFilterChange = useCallback(debounce(onFilterChange, FILTER_TYPING_DEBOUNCE_MS), [
    onFilterChange,
  ]);

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
      setAlertParams('metric', metric);
    },
    [setAlertParams]
  );

  const updateSeverityThreshold = useCallback(
    (threshold: any) => {
      setAlertParams('threshold', threshold);
    },
    [setAlertParams]
  );

  const handleFieldSearchChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => onFilterChange(e.target.value),
    [onFilterChange]
  );

  const preFillAlertFilter = useCallback(() => {
    const md = metadata;
    if (md && md.filter) {
      setAlertParams('filterQueryText', md.filter);
      setAlertParams(
        'filterQuery',
        convertKueryToElasticSearchQuery(md.filter, derivedIndexPattern) || ''
      );
    }
  }, [metadata, derivedIndexPattern, setAlertParams]);

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
    if (md && md.options?.metric) {
      setAlertParams(
        'metric',
        getMLMetricFromInventoryMetric(md.options.metric!.type) ?? defaultExpression.metric
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

    if (!alertParams.filterQuery) {
      preFillAlertFilter();
    }

    if (!alertParams.sourceId) {
      setAlertParams('sourceId', source?.id || 'default');
    }
  }, [metadata, derivedIndexPattern, defaultExpression, source]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <EuiSpacer size={'m'} />
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
                  defaultMessage: 'Memory Usage',
                }),
                fieldRequired: false,
                value: 'memory_usage',
                validNormalizedTypes: [],
              },
              network_in: {
                text: i18n.translate('xpack.infra.metrics.alertFlyout.anomalyJobs.networkIn', {
                  defaultMessage: 'Network In',
                }),
                fieldRequired: false,
                validNormalizedTypes: [],
                value: 'network_in',
              },
              network_out: {
                text: i18n.translate('xpack.infra.metrics.alertFlyout.anomalyJobs.networkOut', {
                  defaultMessage: 'Network Out',
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

      <EuiFormRow
        label={i18n.translate('xpack.infra.metrics.alertFlyout.filterLabel', {
          defaultMessage: 'Filter (optional)',
        })}
        helpText={i18n.translate('xpack.infra.metrics.alertFlyout.filterHelpText', {
          defaultMessage: 'Use a KQL expression to limit the scope of your alert trigger.',
        })}
        fullWidth
        display="rowCompressed"
      >
        {(metadata && (
          <MetricsExplorerKueryBar
            derivedIndexPattern={derivedIndexPattern}
            onSubmit={onFilterChange}
            onChange={debouncedOnFilterChange}
            value={alertParams.filterQueryText}
          />
        )) || (
          <EuiFieldSearch
            onChange={handleFieldSearchChange}
            value={alertParams.filterQueryText}
            fullWidth
          />
        )}
      </EuiFormRow>

      <EuiSpacer size={'m'} />
      <AlertPreview
        alertInterval={alertInterval}
        alertThrottle={alertThrottle}
        alertType={METRIC_ANOMALY_ALERT_TYPE_ID}
        alertParams={pick(
          alertParams,
          'metric',
          'threshold',
          'nodeType',
          'sourceId',
          'filterQuery'
        )}
        validate={validateMetricAnomaly}
      />
      <EuiSpacer size={'m'} />
    </>
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
  host: {
    text: getDisplayNameForType('host'),
    value: 'host',
  },
  k8s: {
    text: getDisplayNameForType('pod'),
    value: 'k8s',
  },
};

const getMLMetricFromInventoryMetric = (metric: SnapshotMetricType) => {
  switch (metric) {
    case 'memory':
      return 'memory_usage';
    case 'tx':
      return 'network_out';
    case 'rx':
      return 'network_in';
    default:
      return false;
  }
};

const getMLNodeTypeFromInventoryNodeType = (nodeType: InventoryItemType) => {
  switch (nodeType) {
    case 'host':
      return 'host';
    case 'pod':
      return 'k8s';
    default:
      return false;
  }
};
