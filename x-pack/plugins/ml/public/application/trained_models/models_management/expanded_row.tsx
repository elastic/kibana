/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useEffect, useState } from 'react';
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
  EuiTitle,
} from '@elastic/eui';
import type { EuiDescriptionListProps } from '@elastic/eui/src/components/description_list/description_list';
import { FormattedMessage } from '@kbn/i18n-react';
import type { ModelItemFull } from './models_list';
import { timeFormatter } from '../../../../common/util/date_utils';
import { isDefined } from '../../../../common/types/guards';
import { isPopulatedObject } from '../../../../common';
import { ModelPipelines } from './pipelines';
import { AllocatedModels } from '../nodes_overview/allocated_models';
import type { AllocatedModel } from '../../../../common/types/trained_models';

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

const formatterDictionary: Record<string, (value: any) => JSX.Element | string | undefined> = {
  tags: badgeFormatter,
  roles: badgeFormatter,
  create_time: timeFormatter,
  timestamp: timeFormatter,
};

export function formatToListItems(
  items: Record<string, unknown> | object
): EuiDescriptionListProps['listItems'] {
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
}

export const ExpandedRow: FC<ExpandedRowProps> = ({ item }) => {
  const [modelItems, setModelItems] = useState<AllocatedModel[]>([]);

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

  const tabs = [
    {
      id: 'details',
      name: (
        <FormattedMessage
          id="xpack.ml.trainedModels.modelsList.expandedRow.detailsTabLabel"
          defaultMessage="Details"
        />
      ),
      content: (
        <>
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
        </>
      ),
    },
    ...(inferenceConfig
      ? [
          {
            id: 'config',
            name: (
              <FormattedMessage
                id="xpack.ml.trainedModels.modelsList.expandedRow.configTabLabel"
                defaultMessage="Config"
              />
            ),
            content: (
              <>
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
              </>
            ),
          },
        ]
      : []),
    ...(isPopulatedObject(omit(stats, ['pipeline_count', 'ingest']))
      ? [
          {
            id: 'stats',
            name: (
              <FormattedMessage
                id="xpack.ml.trainedModels.modelsList.expandedRow.statsTabLabel"
                defaultMessage="Stats"
              />
            ),
            content: (
              <>
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
                </EuiFlexGrid>
              </>
            ),
          },
        ]
      : []),
    ...((pipelines && Object.keys(pipelines).length > 0) || stats.ingest
      ? [
          {
            id: 'pipelines',
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
              <>
                <EuiSpacer size={'s'} />
                <ModelPipelines pipelines={pipelines!} ingestStats={stats.ingest} />
              </>
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
    />
  );
};
