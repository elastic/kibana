/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useEffect, useState, useMemo, useCallback } from 'react';
import { omit, pick } from 'lodash';
import {
  EuiBadge,
  EuiCodeBlock,
  EuiDescriptionList,
  EuiFlexGrid,
  EuiFlexItem,
  EuiNotificationBadge,
  EuiPanel,
  EuiSpacer,
  EuiTabbedContent,
  EuiTabbedContentTab,
  EuiTitle,
} from '@elastic/eui';
import type { EuiDescriptionListProps } from '@elastic/eui/src/components/description_list/description_list';
import { FormattedMessage } from '@kbn/i18n-react';
import { FIELD_FORMAT_IDS } from '@kbn/field-formats-plugin/common';
import type { ModelItemFull } from './models_list';
import { isDefined } from '../../../../common/types/guards';
import { isPopulatedObject } from '../../../../common';
import { ModelPipelines } from './pipelines';
import { AllocatedModels } from '../nodes_overview/allocated_models';
import type { AllocatedModel } from '../../../../common/types/trained_models';
import { useFieldFormatter } from '../../contexts/kibana/use_field_formatter';

interface ExpandedRowProps {
  item: ModelItemFull;
}

const badgeFormatter = (items: string[]) => {
  if (items.length === 0) return;
  return (
    <div>
      {items.map((item) => (
        <EuiBadge key={item} color="hollow">
          {item}
        </EuiBadge>
      ))}
    </div>
  );
};

export function useListItemsFormatter() {
  const bytesFormatter = useFieldFormatter(FIELD_FORMAT_IDS.BYTES);
  const dateFormatter = useFieldFormatter(FIELD_FORMAT_IDS.DATE);

  const formatterDictionary: Record<string, (value: any) => JSX.Element | string | undefined> =
    useMemo(
      () => ({
        tags: badgeFormatter,
        roles: badgeFormatter,
        create_time: dateFormatter,
        timestamp: dateFormatter,
        model_size_bytes: bytesFormatter,
        required_native_memory_bytes: bytesFormatter,
      }),
      []
    );

  return useCallback(
    (items: Record<string, unknown> | object): EuiDescriptionListProps['listItems'] => {
      return Object.entries(items)
        .filter(([, value]) => isDefined(value))
        .map(([title, value]) => {
          if (title in formatterDictionary) {
            return {
              title,
              description: formatterDictionary[title](value),
            };
          }
          return {
            title,
            description:
              typeof value === 'object' ? (
                <EuiCodeBlock
                  language="json"
                  fontSize="s"
                  paddingSize="s"
                  overflowHeight={300}
                  isCopyable={false}
                >
                  {JSON.stringify(value, null, 2)}
                </EuiCodeBlock>
              ) : (
                value.toString()
              ),
          };
        });
    },
    [formatterDictionary]
  );
}

export const ExpandedRow: FC<ExpandedRowProps> = ({ item }) => {
  const [modelItems, setModelItems] = useState<AllocatedModel[]>([]);

  const formatToListItems = useListItemsFormatter();

  const {
    inference_config: inferenceConfig,
    stats,
    metadata,
    tags,
    version,
    // eslint-disable-next-line @typescript-eslint/naming-convention
    estimated_operations,
    // eslint-disable-next-line @typescript-eslint/naming-convention
    estimated_heap_memory_usage_bytes,
    // eslint-disable-next-line @typescript-eslint/naming-convention
    default_field_map,
    // eslint-disable-next-line @typescript-eslint/naming-convention
    license_level,
    pipelines,
    description,
  } = item;

  const { analytics_config: analyticsConfig, ...restMetaData } = metadata ?? {};

  const details = {
    description,
    tags,
    version,
    estimated_operations,
    estimated_heap_memory_usage_bytes,
    default_field_map,
    license_level,
  };

  useEffect(
    function updateModelItems() {
      (async function () {
        const deploymentStats = stats.deployment_stats;
        const modelSizeStats = stats.model_size_stats;

        if (!deploymentStats || !modelSizeStats) return;

        const items: AllocatedModel[] = deploymentStats.nodes.map((n) => {
          const nodeName = Object.values(n.node)[0].name;
          return {
            ...deploymentStats,
            ...modelSizeStats,
            node: {
              ...pick(n, [
                'average_inference_time_ms',
                'inference_count',
                'routing_state',
                'last_access',
                'number_of_pending_requests',
                'start_time',
                'throughput_last_minute',
              ]),
              name: nodeName,
            } as AllocatedModel['node'],
          };
        });

        setModelItems(items);
      })();
    },
    [stats.deployment_stats]
  );

  const tabs: EuiTabbedContentTab[] = [
    {
      id: 'details',
      'data-test-subj': 'mlTrainedModelDetails',
      name: (
        <FormattedMessage
          id="xpack.ml.trainedModels.modelsList.expandedRow.detailsTabLabel"
          defaultMessage="Details"
        />
      ),
      content: (
        <div data-test-subj={'mlTrainedModelDetailsContent'}>
          <EuiSpacer size={'s'} />
          <EuiFlexGrid columns={2} gutterSize={'m'}>
            <EuiFlexItem>
              <EuiPanel>
                <EuiTitle size={'xs'}>
                  <h5>
                    <FormattedMessage
                      id="xpack.ml.trainedModels.modelsList.expandedRow.detailsTitle"
                      defaultMessage="Details"
                    />
                  </h5>
                </EuiTitle>
                <EuiSpacer size={'m'} />
                <EuiDescriptionList
                  compressed={true}
                  type="column"
                  listItems={formatToListItems(details)}
                />
              </EuiPanel>
            </EuiFlexItem>
            {isPopulatedObject(restMetaData) ? (
              <EuiFlexItem>
                <EuiPanel>
                  <EuiTitle size={'xs'}>
                    <h5>
                      <FormattedMessage
                        id="xpack.ml.trainedModels.modelsList.expandedRow.metadataTitle"
                        defaultMessage="Metadata"
                      />
                    </h5>
                  </EuiTitle>
                  <EuiSpacer size={'m'} />
                  <EuiDescriptionList
                    compressed={true}
                    type="column"
                    listItems={formatToListItems(restMetaData)}
                  />
                </EuiPanel>
              </EuiFlexItem>
            ) : null}
          </EuiFlexGrid>
        </div>
      ),
    },
    ...(inferenceConfig
      ? [
          {
            id: 'config',
            'data-test-subj': 'mlTrainedModelInferenceConfig',
            name: (
              <FormattedMessage
                id="xpack.ml.trainedModels.modelsList.expandedRow.configTabLabel"
                defaultMessage="Config"
              />
            ),
            content: (
              <div data-test-subj={'mlTrainedModelInferenceConfigContent'}>
                <EuiSpacer size={'s'} />
                <EuiFlexGrid columns={2} gutterSize={'m'}>
                  <EuiFlexItem>
                    <EuiPanel>
                      <EuiTitle size={'xs'}>
                        <h5>
                          <FormattedMessage
                            id="xpack.ml.trainedModels.modelsList.expandedRow.inferenceConfigTitle"
                            defaultMessage="Inference configuration"
                          />
                        </h5>
                      </EuiTitle>
                      <EuiSpacer size={'m'} />
                      <EuiDescriptionList
                        compressed={true}
                        type="column"
                        listItems={formatToListItems(
                          inferenceConfig[Object.keys(inferenceConfig)[0]]
                        )}
                      />
                    </EuiPanel>
                  </EuiFlexItem>
                  {analyticsConfig && (
                    <EuiFlexItem>
                      <EuiPanel>
                        <EuiTitle size={'xs'}>
                          <h5>
                            <FormattedMessage
                              id="xpack.ml.trainedModels.modelsList.expandedRow.analyticsConfigTitle"
                              defaultMessage="Analytics configuration"
                            />
                          </h5>
                        </EuiTitle>
                        <EuiSpacer size={'m'} />
                        <EuiDescriptionList
                          compressed={true}
                          type="column"
                          listItems={formatToListItems(analyticsConfig)}
                        />
                      </EuiPanel>
                    </EuiFlexItem>
                  )}
                </EuiFlexGrid>
              </div>
            ),
          },
        ]
      : []),
    ...(isPopulatedObject(omit(stats, ['pipeline_count', 'ingest']))
      ? [
          {
            id: 'stats',
            'data-test-subj': 'mlTrainedModelStats',
            name: (
              <FormattedMessage
                id="xpack.ml.trainedModels.modelsList.expandedRow.statsTabLabel"
                defaultMessage="Stats"
              />
            ),
            content: (
              <div data-test-subj={'mlTrainedModelStatsContent'}>
                <EuiSpacer size={'s'} />

                <EuiFlexGrid columns={2} gutterSize={'m'}>
                  {!!modelItems?.length ? (
                    <EuiFlexItem grow={2}>
                      <EuiPanel>
                        <EuiTitle size={'xs'}>
                          <h5>
                            <FormattedMessage
                              id="xpack.ml.trainedModels.modelsList.expandedRow.deploymentStatsTitle"
                              defaultMessage="Deployment stats"
                            />
                          </h5>
                        </EuiTitle>
                        <EuiSpacer size={'m'} />
                        <AllocatedModels models={modelItems} hideColumns={['model_id']} />
                      </EuiPanel>
                    </EuiFlexItem>
                  ) : null}
                  {stats.inference_stats ? (
                    <EuiFlexItem>
                      <EuiPanel>
                        <EuiTitle size={'xs'}>
                          <h5>
                            <FormattedMessage
                              id="xpack.ml.trainedModels.modelsList.expandedRow.inferenceStatsTitle"
                              defaultMessage="Inference stats"
                            />
                          </h5>
                        </EuiTitle>
                        <EuiSpacer size={'m'} />
                        <EuiDescriptionList
                          compressed={true}
                          type="column"
                          listItems={formatToListItems(stats.inference_stats)}
                        />
                      </EuiPanel>
                    </EuiFlexItem>
                  ) : null}
                  {isPopulatedObject(stats.model_size_stats) &&
                  !isPopulatedObject(stats.inference_stats) ? (
                    <EuiFlexItem>
                      <EuiPanel>
                        <EuiTitle size={'xs'}>
                          <h5>
                            <FormattedMessage
                              id="xpack.ml.trainedModels.modelsList.expandedRow.modelSizeStatsTitle"
                              defaultMessage="Model size stats"
                            />
                          </h5>
                        </EuiTitle>
                        <EuiSpacer size={'m'} />
                        <EuiDescriptionList
                          compressed={true}
                          type="column"
                          listItems={formatToListItems(stats.model_size_stats)}
                        />
                      </EuiPanel>
                    </EuiFlexItem>
                  ) : null}
                </EuiFlexGrid>
              </div>
            ),
          },
        ]
      : []),
    ...((pipelines && Object.keys(pipelines).length > 0) || stats.ingest
      ? [
          {
            id: 'pipelines',
            'data-test-subj': 'mlTrainedModelPipelines',
            name: (
              <>
                <FormattedMessage
                  id="xpack.ml.trainedModels.modelsList.expandedRow.pipelinesTabLabel"
                  defaultMessage="Pipelines"
                />{' '}
                <EuiNotificationBadge>{stats.pipeline_count}</EuiNotificationBadge>
              </>
            ),
            content: (
              <div data-test-subj={'mlTrainedModelPipelinesContent'}>
                <EuiSpacer size={'s'} />
                <ModelPipelines pipelines={pipelines!} ingestStats={stats.ingest} />
              </div>
            ),
          },
        ]
      : []),
  ];

  return (
    <EuiTabbedContent
      size="s"
      style={{ width: '100%' }}
      tabs={tabs}
      initialSelectedTab={tabs[0]}
      autoFocus="selected"
      onTabClick={(tab) => {}}
      data-test-subj={'mlTrainedModelRowDetails'}
    />
  );
};
