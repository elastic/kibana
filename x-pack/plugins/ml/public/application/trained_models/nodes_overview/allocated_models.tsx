/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { FC } from 'react';
import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiInMemoryTable,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiBasicTableColumn } from '@elastic/eui/src/components/basic_table/basic_table';
import { FIELD_FORMAT_IDS } from '@kbn/field-formats-plugin/common';
import type {
  AllocatedModel,
  NodeDeploymentStatsResponse,
} from '../../../../common/types/trained_models';
import { useFieldFormatter } from '../../contexts/kibana/use_field_formatter';

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
  const euiTheme = useEuiTheme();

  const columns: Array<EuiBasicTableColumn<AllocatedModel>> = [
    {
      id: 'node_name',
      field: 'node.name',
      name: i18n.translate('xpack.ml.trainedModels.nodesList.modelsList.nodeNameHeader', {
        defaultMessage: 'Node name',
      }),
      width: '150px',
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
      width: '250px',
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
      name: (
        <EuiToolTip
          content={i18n.translate('xpack.ml.trainedModels.nodesList.modelsList.allocationTooltip', {
            defaultMessage: 'number_of_allocations times threads_per_allocation',
          })}
        >
          <span>
            {i18n.translate('xpack.ml.trainedModels.nodesList.modelsList.allocationHeader', {
              defaultMessage: 'Allocation',
            })}
            <EuiIcon size="s" color="subdued" type="questionInCircle" className="eui-alignTop" />
          </span>
        </EuiToolTip>
      ),
      width: '100px',
      truncateText: false,
      'data-test-subj': 'mlAllocatedModelsTableAllocation',
      render: (v: AllocatedModel) => {
        return `${v.node.number_of_allocations} * ${v.node.threads_per_allocation}`;
      },
    },
    {
      field: 'node.throughput_last_minute',
      name: i18n.translate(
        'xpack.ml.trainedModels.nodesList.modelsList.throughputLastMinuteHeader',
        {
          defaultMessage: 'Throughput',
        }
      ),
      width: '100px',
      truncateText: false,
      'data-test-subj': 'mlAllocatedModelsTableThroughput',
    },
    {
      name: (
        <EuiToolTip
          display={'block'}
          title={
            <FormattedMessage
              id="xpack.ml.trainedModels.nodesList.modelsList.modelAvgInferenceTimeTooltipHeader"
              defaultMessage="Average inference time"
            />
          }
          content={
            <FormattedMessage
              id="xpack.ml.trainedModels.nodesList.modelsList.modelAvgInferenceTimeTooltipMessage"
              defaultMessage="If caching is enabled, fast cache hits are included when calculating the average inference time."
            />
          }
        >
          <EuiFlexGroup gutterSize={'xs'}>
            <EuiFlexItem grow={false} css={{ minWidth: 0 }}>
              <span css={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                <FormattedMessage
                  id="xpack.ml.trainedModels.nodesList.modelsList.modelAvgInferenceTimeHeader"
                  defaultMessage="Avg inference time"
                />
              </span>
            </EuiFlexItem>
            <EuiFlexItem grow={false} css={{ minWidth: euiTheme.euiTheme.size.m }}>
              <EuiIcon size="s" color="subdued" type="questionInCircle" className="eui-alignTop" />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiToolTip>
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
        return v.node.last_access ? dateFormatter(v.node.last_access) : '-';
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
      css={{ overflow: 'auto' }}
    />
  );
};
