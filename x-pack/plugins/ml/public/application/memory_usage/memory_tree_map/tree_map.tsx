/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useEffect, useState, useCallback, useMemo } from 'react';
import {
  Chart,
  Settings,
  Partition,
  PartitionLayout,
  ShapeTreeNode,
  LIGHT_THEME,
  DARK_THEME,
} from '@elastic/charts';
import { EUI_CHARTS_THEME_DARK, EUI_CHARTS_THEME_LIGHT } from '@elastic/eui/dist/eui_charts_theme';
import { FIELD_FORMAT_IDS } from '@kbn/field-formats-plugin/common';
import { EuiComboBox, EuiComboBoxOptionOption, EuiEmptyPrompt, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { MemoryUsageInfo } from '../../../../common/types/trained_models';
import { JobType, MlSavedObjectType } from '../../../../common/types/saved_objects';
import { useTrainedModelsApiService } from '../../services/ml_api_service/trained_models';
import { LoadingWrapper } from '../../jobs/new_job/pages/components/charts/loading_wrapper';
import { useFieldFormatter, useUiSettings } from '../../contexts/kibana';

import { useRefresh } from '../../routing/use_refresh';
import { getMemoryItemColor } from '../memory_item_colors';
import { useToastNotificationService } from '../../services/toast_notification_service';

interface Props {
  node?: string;
  type?: MlSavedObjectType;
  height?: string;
}

const DEFAULT_CHART_HEIGHT = '400px';

const TYPE_LABELS: Record<string, MlSavedObjectType> = {
  [i18n.translate('xpack.ml.memoryUsage.treeMap.adLabel', {
    defaultMessage: 'Anomaly detection jobs',
  })]: 'anomaly-detector',
  [i18n.translate('xpack.ml.memoryUsage.treeMap.dfaLabel', {
    defaultMessage: 'Data frame analytics jobs',
  })]: 'data-frame-analytics',
  [i18n.translate('xpack.ml.memoryUsage.treeMap.modelsLabel', {
    defaultMessage: 'Trained models',
  })]: 'trained-model',
} as const;

const TYPE_LABELS_INVERTED = Object.entries(TYPE_LABELS).reduce<Record<MlSavedObjectType, string>>(
  (acc, [label, type]) => {
    acc[type] = label;
    return acc;
  },
  {} as Record<MlSavedObjectType, string>
);

const TYPE_OPTIONS: EuiComboBoxOptionOption[] = Object.entries(TYPE_LABELS).map(
  ([label, type]) => ({
    label,
    color: getMemoryItemColor(type),
  })
);

export const JobMemoryTreeMap: FC<Props> = ({ node, type, height }) => {
  const isDarkTheme = useUiSettings().get('theme:darkMode');
  const { theme, baseTheme } = useMemo(
    () =>
      isDarkTheme
        ? { theme: EUI_CHARTS_THEME_DARK, baseTheme: DARK_THEME }
        : { theme: EUI_CHARTS_THEME_LIGHT, baseTheme: LIGHT_THEME },
    [isDarkTheme]
  );

  const bytesFormatter = useFieldFormatter(FIELD_FORMAT_IDS.BYTES);
  const { displayErrorToast } = useToastNotificationService();
  const refresh = useRefresh();
  const chartHeight = height ?? DEFAULT_CHART_HEIGHT;

  const trainedModelsApiService = useTrainedModelsApiService();
  const [allData, setAllData] = useState<MemoryUsageInfo[]>([]);
  const [data, setData] = useState<MemoryUsageInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedOptions, setSelectedOptions] = useState(TYPE_OPTIONS);

  const filterData = useCallback(
    (dataIn: MemoryUsageInfo[]) => {
      const types = selectedOptions.map((o) => TYPE_LABELS[o.label]);
      return dataIn.filter((d) => types.includes(d.type));
    },
    [selectedOptions]
  );

  const loadJobMemorySize = useCallback(async () => {
    setLoading(true);
    try {
      const resp = await trainedModelsApiService.memoryUsage(type, node);
      setAllData(resp);
    } catch (error) {
      displayErrorToast(
        error,
        i18n.translate('xpack.ml.memoryUsage.treeMap.fetchFailedErrorMessage', {
          defaultMessage: 'Models memory usage fetch failed',
        })
      );
    }
    setLoading(false);
  }, [trainedModelsApiService, type, node, displayErrorToast]);

  useEffect(
    function redrawOnFilterChange() {
      setData(filterData(allData));
    },
    [selectedOptions, allData, filterData]
  );

  useEffect(
    function updateOnTimerRefresh() {
      loadJobMemorySize();
    },
    [loadJobMemorySize, refresh]
  );

  return (
    <div
      style={{ height: chartHeight }}
      data-test-subj={`mlJobTreeMap ${data.length ? 'withData' : 'empty'}`}
    >
      <EuiSpacer size="s" />
      <LoadingWrapper height={chartHeight} hasData={data.length > 0} loading={loading}>
        <EuiComboBox
          fullWidth
          options={TYPE_OPTIONS}
          selectedOptions={selectedOptions}
          onChange={setSelectedOptions}
          isClearable={false}
        />

        <EuiSpacer size="s" />

        {data.length ? (
          <Chart>
            <Settings baseTheme={baseTheme} theme={theme.theme} />
            <Partition<MemoryUsageInfo>
              id="memoryUsageTreeMap"
              data={data}
              layout={PartitionLayout.treemap}
              valueAccessor={(d) => d.size}
              valueFormatter={(size: number) => bytesFormatter(size)}
              layers={[
                {
                  groupByRollup: (d: MemoryUsageInfo) => d.type,
                  nodeLabel: (d) => TYPE_LABELS_INVERTED[d as MlSavedObjectType],
                  fillLabel: {
                    valueFormatter: (size: number) => bytesFormatter(size),
                  },
                  shape: {
                    fillColor: (d: ShapeTreeNode) => getMemoryItemColor(d.dataName as JobType),
                  },
                },
                {
                  groupByRollup: (d: MemoryUsageInfo) => d.id,
                  nodeLabel: (d) => `${d}`,
                  fillLabel: {
                    valueFont: {
                      fontWeight: 100,
                    },
                  },
                  shape: {
                    fillColor: (d: ShapeTreeNode) => {
                      // color the shape the same as its parent.
                      const parentId = d.parent.path[d.parent.path.length - 1].value as JobType;
                      return getMemoryItemColor(parentId);
                    },
                  },
                },
              ]}
            />
          </Chart>
        ) : (
          <EuiEmptyPrompt
            titleSize="xs"
            iconType="alert"
            data-test-subj="mlEmptyMemoryUsageTreeMap"
            title={
              <h2>
                <FormattedMessage
                  id="xpack.ml.memoryUsage.treeMap.emptyPrompt"
                  defaultMessage="No open jobs or trained models match the current selection. "
                />
              </h2>
            }
          />
        )}
      </LoadingWrapper>
    </div>
  );
};
