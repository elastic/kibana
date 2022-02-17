/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { FC } from 'react';
import { EuiBadge, EuiInMemoryTable, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { EuiBasicTableColumn } from '@elastic/eui/src/components/basic_table/basic_table';
import type {
  AllocatedModel,
  NodeDeploymentStatsResponse,
} from '../../../../common/types/trained_models';
import { useFieldFormatter } from '../../contexts/kibana/use_field_formatter';
import { FIELD_FORMAT_IDS } from '../../../../../../../src/plugins/field_formats/common';

interface AllocatedModelsProps {
  models: NodeDeploymentStatsResponse['allocated_models'];
  hideColumns?: string[];
}

export const AllocatedModels: FC<AllocatedModelsProps> = ({
  models,
  hideColumns = ['node_name'],
}) => {
  const bytesFormatter = useFieldFormatter(FIELD_FORMAT_IDS.BYTES);
  const dateFormatter = useFieldFormatter(FIELD_FORMAT_IDS.DATE);
  const durationFormatter = useFieldFormatter(FIELD_FORMAT_IDS.DURATION);

  const columns: Array<EuiBasicTableColumn<AllocatedModel>> = [
    {
      id: 'node_name',
      field: 'node.name',
      name: i18n.translate('xpack.ml.trainedModels.nodesList.modelsList.nodeNameHeader', {
        defaultMessage: 'Node name',
      }),
      width: '200px',
      sortable: true,
      truncateText: false,
      'data-test-subj': 'mlAllocatedModelsTableNodeName',
    },
    {
      id: 'model_id',
      field: 'model_id',
      name: i18n.translate('xpack.ml.trainedModels.nodesList.modelsList.modelNameHeader', {
        defaultMessage: 'Name',
      }),
      width: '300px',
      sortable: true,
      truncateText: false,
      'data-test-subj': 'mlAllocatedModelsTableName',
    },
    {
      name: i18n.translate('xpack.ml.trainedModels.nodesList.modelsList.modelSizeHeader', {
        defaultMessage: 'Size',
      }),
      width: '100px',
      truncateText: true,
      'data-test-subj': 'mlAllocatedModelsTableSize',
      render: (v: AllocatedModel) => {
        return bytesFormatter(v.required_native_memory_bytes);
      },
    },
    {
      field: 'state',
      name: i18n.translate('xpack.ml.trainedModels.nodesList.modelsList.modelStateHeader', {
        defaultMessage: 'State',
      }),
      width: '100px',
      truncateText: false,
      'data-test-subj': 'mlAllocatedModelsTableState',
    },
    {
      name: i18n.translate(
        'xpack.ml.trainedModels.nodesList.modelsList.modelAvgInferenceTimeHeader',
        {
          defaultMessage: 'Avg inference time',
        }
      ),
      width: '100px',
      truncateText: false,
      'data-test-subj': 'mlAllocatedModelsTableAvgInferenceTime',
      render: (v: AllocatedModel) => {
        return v.node.average_inference_time_ms
          ? durationFormatter(v.node.average_inference_time_ms)
          : '-';
      },
    },
    {
      name: i18n.translate(
        'xpack.ml.trainedModels.nodesList.modelsList.modelInferenceCountHeader',
        {
          defaultMessage: 'Inference count',
        }
      ),
      width: '100px',
      'data-test-subj': 'mlAllocatedModelsTableInferenceCount',
      render: (v: AllocatedModel) => {
        return v.node.inference_count;
      },
    },
    {
      name: i18n.translate('xpack.ml.trainedModels.nodesList.modelsList.modelStartTimeHeader', {
        defaultMessage: 'Start time',
      }),
      width: '200px',
      'data-test-subj': 'mlAllocatedModelsTableStartedTime',
      render: (v: AllocatedModel) => {
        return dateFormatter(v.node.start_time);
      },
    },
    {
      name: i18n.translate('xpack.ml.trainedModels.nodesList.modelsList.modelLastAccessHeader', {
        defaultMessage: 'Last access',
      }),
      width: '200px',
      'data-test-subj': 'mlAllocatedModelsTableInferenceCount',
      render: (v: AllocatedModel) => {
        return dateFormatter(v.node.last_access);
      },
    },
    {
      name: i18n.translate(
        'xpack.ml.trainedModels.nodesList.modelsList.modelNumberOfPendingRequestsHeader',
        {
          defaultMessage: 'Pending requests',
        }
      ),
      width: '100px',
      'data-test-subj': 'mlAllocatedModelsTableNumberOfPendingRequests',
      render: (v: AllocatedModel) => {
        return v.node.number_of_pending_requests;
      },
    },
    {
      name: i18n.translate('xpack.ml.trainedModels.nodesList.modelsList.modelRoutingStateHeader', {
        defaultMessage: 'Routing state',
      }),
      width: '100px',
      'data-test-subj': 'mlAllocatedModelsTableRoutingState',
      render: (v: AllocatedModel) => {
        const { routing_state: routingState, reason } = v.node.routing_state;

        return (
          <EuiToolTip content={reason ? reason : ''}>
            <EuiBadge color={reason ? 'danger' : 'hollow'}>{routingState}</EuiBadge>
          </EuiToolTip>
        );
      },
    },
  ].filter((v) => !hideColumns.includes(v.id!));

  return (
    <EuiInMemoryTable<AllocatedModel>
      allowNeutralSort={false}
      columns={columns}
      hasActions={false}
      isExpandable={false}
      isSelectable={false}
      items={models}
      itemId={'model_id'}
      rowProps={(item) => ({
        'data-test-subj': `mlAllocatedModelTableRow row-${item.model_id}`,
      })}
      onTableChange={() => {}}
      data-test-subj={'mlNodesAllocatedModels'}
    />
  );
};
