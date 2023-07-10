/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC, useCallback, useMemo } from 'react';
import { omit, pick } from 'lodash';
import {
  EuiBadge,
  EuiCodeBlock,
  EuiDescriptionList,
  EuiDescriptionListProps,
  EuiFlexGrid,
  EuiFlexItem,
  EuiNotificationBadge,
  EuiPanel,
  EuiSpacer,
  EuiTabbedContent,
  EuiTabbedContentTab,
  EuiTitle,
  useEuiPaddingSize,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { FIELD_FORMAT_IDS } from '@kbn/field-formats-plugin/common';
import { isPopulatedObject } from '@kbn/ml-is-populated-object';
import { isDefined } from '@kbn/ml-is-defined';
import { TRAINED_MODEL_TYPE } from '@kbn/ml-trained-models-utils';
import type { ModelItemFull } from './models_list';
import { ModelPipelines } from './pipelines';
import { AllocatedModels } from '../memory_usage/nodes_overview/allocated_models';
import type { AllocatedModel, TrainedModelStat } from '../../../common/types/trained_models';
import { useFieldFormatter } from '../contexts/kibana/use_field_formatter';

interface ExpandedRowProps {
  item: ModelItemFull;
}

const useBadgeFormatter = () => {
  const xs = useEuiPaddingSize('xs');

  function badgeFormatter(items: string[]) {
    if (items.length === 0) return;
    return (
      <div>
        {items.map((item) => (
          <span css={{ marginRight: xs! }} key={item}>
            <EuiBadge color="hollow" css={{ marginRight: xs! }}>
              {item}
            </EuiBadge>
          </span>
        ))}
      </div>
    );
  }
  return { badgeFormatter };
};

export function useListItemsFormatter() {
  const bytesFormatter = useFieldFormatter(FIELD_FORMAT_IDS.BYTES);
  const dateFormatter = useFieldFormatter(FIELD_FORMAT_IDS.DATE);
  const { badgeFormatter } = useBadgeFormatter();

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
      // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const inferenceStats = useMemo<TrainedModelStat['inference_stats']>(() => {
    if (!isPopulatedObject(stats.inference_stats) || item.model_type === TRAINED_MODEL_TYPE.PYTORCH)
      return;

    return stats.inference_stats;
  }, [stats.inference_stats, item.model_type]);

  const { analytics_config: analyticsConfig, ...restMetaData } = metadata ?? {};

  const details = useMemo(() => {
    return {
      description,
      tags,
      version,
      estimated_operations,
      estimated_heap_memory_usage_bytes,
      default_field_map,
      license_level,
    };
  }, [
    default_field_map,
    description,
    estimated_heap_memory_usage_bytes,
    estimated_operations,
    license_level,
    tags,
    version,
  ]);

  const deploymentStatItems: AllocatedModel[] = useMemo<AllocatedModel[]>(() => {
    const deploymentStats = stats.deployment_stats;
    const modelSizeStats = stats.model_size_stats;

    if (!deploymentStats || !modelSizeStats) return [];

    const items: AllocatedModel[] = deploymentStats.flatMap((perDeploymentStat) => {
      return perDeploymentStat.nodes.map((n) => {
        const nodeName = Object.values(n.node)[0].name;
        return {
          key: `${perDeploymentStat.deployment_id}_${nodeName}`,
          ...perDeploymentStat,
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
              'number_of_allocations',
              'threads_per_allocation',
              'error_count',
            ]),
            name: nodeName,
          } as AllocatedModel['node'],
        };
      });
    });

    return items;
  }, [stats]);

  const tabs = useMemo<EuiTabbedContentTab[]>(() => {
    return [
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

                  {!!deploymentStatItems?.length ? (
                    <>
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
                        <AllocatedModels models={deploymentStatItems} hideColumns={['model_id']} />
                      </EuiPanel>
                      <EuiSpacer size={'s'} />
                    </>
                  ) : null}

                  <EuiFlexGrid columns={2} gutterSize={'m'}>
                    {inferenceStats ? (
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
                            listItems={formatToListItems(inferenceStats)}
                          />
                        </EuiPanel>
                      </EuiFlexItem>
                    ) : null}
                    {isPopulatedObject(stats.model_size_stats) &&
                    !isPopulatedObject(inferenceStats) ? (
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
      ...((isPopulatedObject(pipelines) && Object.keys(pipelines).length > 0) || stats.ingest
        ? [
            {
              id: 'pipelines',
              'data-test-subj': 'mlTrainedModelPipelines',
              name: (
                <>
                  <FormattedMessage
                    id="xpack.ml.trainedModels.modelsList.expandedRow.pipelinesTabLabel"
                    defaultMessage="Pipelines"
                  />
                  {isPopulatedObject(pipelines) ? (
                    <EuiNotificationBadge>{Object.keys(pipelines).length}</EuiNotificationBadge>
                  ) : null}
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
  }, [
    analyticsConfig,
    deploymentStatItems,
    details,
    formatToListItems,
    inferenceConfig,
    inferenceStats,
    pipelines,
    restMetaData,
    stats,
  ]);

  const initialSelectedTab =
    item.state === 'started' ? tabs.find((t) => t.id === 'stats') : tabs[0];

  return (
    <EuiTabbedContent
      size="s"
      css={{ width: '100%' }}
      tabs={tabs}
      initialSelectedTab={initialSelectedTab}
      autoFocus="selected"
      data-test-subj={'mlTrainedModelRowDetails'}
    />
  );
};
