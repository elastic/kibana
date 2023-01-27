/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// import React, { FC, useEffect, useCallback } from 'react';
// import { JobType } from '../../../../common/types/saved_objects';
// import { useTrainedModelsApiService } from '../../services/ml_api_service/trained_models';

// interface Props {
//   jobType: JobType;
// }

// export const JobMemoryTreeMap: FC<Props> = ({ jobType }) => {
//   const trainedModelsApiService = useTrainedModelsApiService();

//   const loadJobMemorySize = useCallback(async () => {
//     const resp = await trainedModelsApiService.jobMemorySize(jobType);
//     console.log(resp);
//   }, [jobType, trainedModelsApiService]);

//   useEffect(() => {
//     loadJobMemorySize();
//   }, [loadJobMemorySize]);
//   return <></>;
// };

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useEffect, useState, useCallback } from 'react';
import { Chart, Settings, Partition, PartitionLayout, ShapeTreeNode } from '@elastic/charts';
import { FIELD_FORMAT_IDS } from '@kbn/field-formats-plugin/common';
import {
  EuiComboBox,
  EuiComboBoxOptionOption,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { JobMemorySize } from '../../../../common/types/trained_models';
import { JobType, MlSavedObjectType } from '../../../../common/types/saved_objects';
import { useTrainedModelsApiService } from '../../services/ml_api_service/trained_models';
import { LoadingWrapper } from '../../jobs/new_job/pages/components/charts/loading_wrapper';
import { useFieldFormatter } from '../../contexts/kibana';

import { useRefresh } from '../../routing/use_refresh';
import { getMemoryItemColor } from '../memory_item_colors';

interface Props {
  node?: string;
  type?: MlSavedObjectType;
  height?: string;
}

const DEFAULT_CHART_HEIGHT = '400px';

type TreeMapOptions = EuiComboBoxOptionOption & { objectType: MlSavedObjectType };

export const JobMemoryTreeMap: FC<Props> = ({ node, type, height }) => {
  const bytesFormatter = useFieldFormatter(FIELD_FORMAT_IDS.BYTES);
  const refresh = useRefresh();
  const chartHeight = height ?? DEFAULT_CHART_HEIGHT;

  const trainedModelsApiService = useTrainedModelsApiService();
  const [allData, setAllData] = useState<JobMemorySize[]>([]);
  const [data, setData] = useState<JobMemorySize[]>([]);
  const [loading, setLoading] = useState(false);

  const TYPE_OPTIONS: TreeMapOptions[] = [
    {
      label: i18n.translate('xpack.ml.memoryUsage.treeMap.adLabel', {
        defaultMessage: 'Anomaly detection jobs',
      }),
      objectType: 'anomaly-detector',
      color: getMemoryItemColor('anomaly-detector'),
    },
    {
      label: i18n.translate('xpack.ml.memoryUsage.treeMap.dfaLabel', {
        defaultMessage: 'Data frame analytics jobs',
      }),
      objectType: 'data-frame-analytics',
      color: getMemoryItemColor('data-frame-analytics'),
    },
    {
      label: i18n.translate('xpack.ml.memoryUsage.treeMap.modelsLabel', {
        defaultMessage: 'Trained models',
      }),
      objectType: 'trained-model',
      color: getMemoryItemColor('trained-model'),
    },
  ];
  const [selectedOptions, setSelectedOptions] = useState<TreeMapOptions[]>(TYPE_OPTIONS);

  const filterData = useCallback(
    (dataIn: JobMemorySize[]) => {
      const labels = selectedOptions.map((o) => o.objectType);
      return dataIn.filter((d) => labels.includes(d.type));
    },
    [selectedOptions]
  );

  const onTypeChange = useCallback((types: EuiComboBoxOptionOption[]) => {
    setSelectedOptions(types as TreeMapOptions[]);
  }, []);

  const loadJobMemorySize = useCallback(async () => {
    setLoading(true);
    const resp = await trainedModelsApiService.jobMemorySize(type, node);
    setAllData(resp);
    // eslint-disable-next-line no-console
    console.log(resp);
    setLoading(false);
  }, [trainedModelsApiService, type, node]);

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
        <EuiFlexGroup>
          <EuiFlexItem />
          <EuiFlexItem>
            <EuiComboBox
              fullWidth
              options={TYPE_OPTIONS as EuiComboBoxOptionOption[]}
              selectedOptions={selectedOptions}
              onChange={onTypeChange}
              isClearable={false}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
        <Chart>
          <Settings
            theme={{
              scales: { histogramPadding: 0.2 },
            }}
          />
          <Partition
            id="spec_1"
            data={data}
            layout={PartitionLayout.treemap}
            valueAccessor={(d: JobMemorySize) => d.size}
            valueFormatter={(size: number) => bytesFormatter(size)}
            layers={[
              {
                groupByRollup: (d: JobMemorySize) => d.type,
                nodeLabel: (d) => `${d}`,
                fillLabel: {
                  valueFormatter: (size: number) => bytesFormatter(size),
                },
                shape: {
                  fillColor: (d: ShapeTreeNode) => {
                    return getMemoryItemColor(d.dataName as JobType);
                  },
                },
              },
              {
                groupByRollup: (d: JobMemorySize) => d.id,
                nodeLabel: (d) => `${d}`,
                fillLabel: {
                  valueFont: {
                    fontWeight: 100,
                  },
                },
                shape: {
                  fillColor: (d: ShapeTreeNode) => {
                    const parentId = d.parent.path[d.parent.path.length - 1].value as JobType;
                    return getMemoryItemColor(parentId);
                  },
                },
              },
            ]}
          />
        </Chart>
      </LoadingWrapper>
    </div>
  );
};
