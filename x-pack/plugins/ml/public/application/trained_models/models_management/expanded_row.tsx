/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, Fragment, useEffect, useState } from 'react';
import { omit } from 'lodash';
import {
  EuiBadge,
  EuiButtonEmpty,
  EuiCodeBlock,
  EuiDescriptionList,
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiListGroup,
  EuiNotificationBadge,
  EuiPanel,
  EuiSpacer,
  EuiTabbedContent,
  EuiText,
  EuiTextColor,
  EuiTitle,
} from '@elastic/eui';
import { EuiDescriptionListProps } from '@elastic/eui/src/components/description_list/description_list';
import { FormattedMessage } from '@kbn/i18n/react';
import type { EuiListGroupItemProps } from '@elastic/eui/src/components/list_group/list_group_item';
import { ModelItemFull } from './models_list';
import { useMlKibana, useMlLocator } from '../../contexts/kibana';
import { timeFormatter } from '../../../../common/util/date_utils';
import { isDefined } from '../../../../common/types/guards';
import { isPopulatedObject } from '../../../../common';
import { ML_PAGES } from '../../../../common/constants/locator';

interface ExpandedRowProps {
  item: ModelItemFull;
}

const formatterDictionary: Record<string, (value: any) => JSX.Element | string | undefined> = {
  tags: (tags: string[]) => {
    if (tags.length === 0) return;
    return (
      <div>
        {tags.map((tag) => (
          <EuiBadge key={tag} color="hollow">
            {tag}
          </EuiBadge>
        ))}
      </div>
    );
  },
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
  const mlLocator = useMlLocator();

  const [deploymentStatsItems, setDeploymentStats] = useState<EuiDescriptionListProps['listItems']>(
    []
  );

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

  const {
    services: { share },
  } = useMlKibana();

  useEffect(
    function updateDeploymentState() {
      (async function () {
        const { nodes, ...deploymentStats } = stats.deployment_stats ?? {};

        if (!isPopulatedObject(deploymentStats)) return;

        const result = formatToListItems(deploymentStats)!;

        const items: EuiListGroupItemProps[] = await Promise.all(
          nodes!.map(async (v) => {
            const nodeObject = Object.values(v.node)[0];
            const href = await mlLocator!.getUrl({
              page: ML_PAGES.TRAINED_MODELS_NODES,
              pageState: {
                nodeId: nodeObject.name,
              },
            });
            return {
              label: nodeObject.name,
              href,
            };
          })
        );

        result.push({
          title: 'nodes',
          description: <EuiListGroup size={'s'} gutterSize={'s'} listItems={items} />,
        });

        setDeploymentStats(result);
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
          <EuiSpacer size={'m'} />
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
                <EuiSpacer size={'m'} />
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
    ...(isPopulatedObject(omit(stats, 'pipeline_count'))
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
                <EuiSpacer size={'m'} />
                {!!deploymentStatsItems?.length ? (
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
                      <EuiDescriptionList
                        compressed={true}
                        type="column"
                        listItems={deploymentStatsItems}
                      />
                    </EuiPanel>
                    <EuiSpacer size={'m'} />
                  </>
                ) : null}
                <EuiFlexGrid columns={2}>
                  {stats.inference_stats && (
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
                  )}
                  {stats.ingest?.total && (
                    <EuiFlexItem>
                      <EuiPanel style={{ maxHeight: '400px', overflow: 'auto' }}>
                        <EuiTitle size={'xs'}>
                          <h5>
                            <FormattedMessage
                              id="xpack.ml.trainedModels.modelsList.expandedRow.ingestStatsTitle"
                              defaultMessage="Ingest stats"
                            />
                          </h5>
                        </EuiTitle>
                        <EuiSpacer size={'m'} />
                        <EuiDescriptionList
                          compressed={true}
                          type="column"
                          listItems={formatToListItems(stats.ingest.total)}
                        />

                        {stats.ingest?.pipelines && (
                          <>
                            <EuiSpacer size={'m'} />
                            <EuiTitle size={'xs'}>
                              <h5>
                                <FormattedMessage
                                  id="xpack.ml.trainedModels.modelsList.expandedRow.byPipelineTitle"
                                  defaultMessage="By pipeline"
                                />
                              </h5>
                            </EuiTitle>
                            <EuiSpacer size={'s'} />
                            {Object.entries(stats.ingest.pipelines).map(
                              ([pipelineName, { processors, ...pipelineStats }], i) => {
                                return (
                                  <Fragment key={pipelineName}>
                                    <EuiFlexGroup>
                                      <EuiFlexItem grow={false}>
                                        <EuiTitle size={'xs'}>
                                          <EuiTextColor color="subdued">
                                            <h5>
                                              {i + 1}. {pipelineName}
                                            </h5>
                                          </EuiTextColor>
                                        </EuiTitle>
                                      </EuiFlexItem>
                                      <EuiFlexItem>
                                        <EuiHorizontalRule size={'full'} margin={'s'} />
                                      </EuiFlexItem>
                                    </EuiFlexGroup>
                                    <EuiSpacer size={'m'} />
                                    <EuiDescriptionList
                                      compressed={true}
                                      type="column"
                                      listItems={formatToListItems(pipelineStats)}
                                    />
                                    <EuiSpacer size={'m'} />
                                    <EuiTitle size={'xxs'}>
                                      <h6>
                                        <FormattedMessage
                                          id="xpack.ml.trainedModels.modelsList.expandedRow.byProcessorTitle"
                                          defaultMessage="By processor"
                                        />
                                      </h6>
                                    </EuiTitle>
                                    <EuiSpacer size={'s'} />
                                    <>
                                      {processors.map((processor) => {
                                        const name = Object.keys(processor)[0];
                                        const { stats: processorStats } = processor[name];
                                        return (
                                          <Fragment key={name}>
                                            <EuiFlexGroup>
                                              <EuiFlexItem grow={false}>
                                                <EuiTitle size={'xxs'}>
                                                  <EuiTextColor color="subdued">
                                                    <h6>{name}</h6>
                                                  </EuiTextColor>
                                                </EuiTitle>
                                              </EuiFlexItem>
                                              <EuiFlexItem>
                                                <EuiHorizontalRule size={'full'} margin={'s'} />
                                              </EuiFlexItem>
                                            </EuiFlexGroup>
                                            <EuiSpacer size={'m'} />
                                            <EuiDescriptionList
                                              compressed={true}
                                              type="column"
                                              listItems={formatToListItems(processorStats)}
                                            />
                                          </Fragment>
                                        );
                                      })}
                                    </>
                                  </Fragment>
                                );
                              }
                            )}
                          </>
                        )}
                      </EuiPanel>
                    </EuiFlexItem>
                  )}
                </EuiFlexGrid>
              </>
            ),
          },
        ]
      : []),
    ...(pipelines && Object.keys(pipelines).length > 0
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
                <EuiSpacer size={'m'} />
                <EuiFlexGrid columns={2} gutterSize={'m'}>
                  {Object.entries(pipelines).map(
                    ([pipelineName, { processors, description: pipelineDescription }]) => {
                      return (
                        <EuiFlexItem key={pipelineName}>
                          <EuiPanel>
                            <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
                              <EuiFlexItem grow={false}>
                                <EuiTitle size={'xs'}>
                                  <h5>{pipelineName}</h5>
                                </EuiTitle>
                              </EuiFlexItem>
                              <EuiFlexItem grow={false}>
                                <EuiButtonEmpty
                                  onClick={() => {
                                    const locator = share.url.locators.get(
                                      'INGEST_PIPELINES_APP_LOCATOR'
                                    );
                                    if (!locator) return;
                                    locator.navigate({
                                      page: 'pipeline_edit',
                                      pipelineId: pipelineName,
                                      absolute: true,
                                    });
                                  }}
                                >
                                  <FormattedMessage
                                    id="xpack.ml.trainedModels.modelsList.expandedRow.editPipelineLabel"
                                    defaultMessage="Edit"
                                  />
                                </EuiButtonEmpty>
                              </EuiFlexItem>
                            </EuiFlexGroup>

                            {pipelineDescription && <EuiText>{pipelineDescription}</EuiText>}
                            <EuiSpacer size={'m'} />
                            <EuiTitle size={'xxs'}>
                              <h6>
                                <FormattedMessage
                                  id="xpack.ml.trainedModels.modelsList.expandedRow.processorsTitle"
                                  defaultMessage="Processors"
                                />
                              </h6>
                            </EuiTitle>
                            <EuiCodeBlock
                              language="json"
                              fontSize="m"
                              paddingSize="m"
                              overflowHeight={300}
                              isCopyable
                            >
                              {JSON.stringify(processors, null, 2)}
                            </EuiCodeBlock>
                          </EuiPanel>
                        </EuiFlexItem>
                      );
                    }
                  )}
                </EuiFlexGrid>
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
