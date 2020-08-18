/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, Fragment } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiDescriptionList,
  EuiPanel,
  EuiSpacer,
  EuiTabbedContent,
  EuiTitle,
  EuiNotificationBadge,
  EuiFlexGrid,
  EuiFlexItem,
  EuiCodeBlock,
  EuiText,
  EuiFlexGroup,
  EuiStat,
} from '@elastic/eui';
import { ModelItemFull } from './models_list';

interface ExpandedRowProps {
  item: ModelItemFull;
}

export const ExpandedRow: FC<ExpandedRowProps> = ({ item }) => {
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
  } = item;

  const details = {
    tags,
    version,
    estimated_operations,
    estimated_heap_memory_usage_bytes,
    default_field_map,
    license_level,
  };

  function formatToListItems(items: Record<string, any>) {
    return Object.entries(items)
      .map(([title, value]) => ({
        title,
        description: typeof value === 'object' ? JSON.stringify(value) : value,
      }))
      .filter(({ description }) => {
        return description !== undefined;
      });
  }

  const tabs = [
    {
      id: 'details',
      name: (
        <FormattedMessage
          id="xpack.ml.inference.modelsList.expandedRow.detailsTabLabel"
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
                      id="xpack.ml.inference.modelsList.expandedRow.detailsTitle"
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
                id="xpack.ml.inference.modelsList.expandedRow.configTabLabel"
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
                            id="xpack.ml.inference.modelsList.expandedRow.inferenceConfigTitle"
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
                  {metadata?.analytics_config && (
                    <EuiFlexItem>
                      <EuiPanel>
                        <EuiTitle size={'xs'}>
                          <h5>
                            <FormattedMessage
                              id="xpack.ml.inference.modelsList.expandedRow.analyticsConfigTitle"
                              defaultMessage="Analytics configuration"
                            />
                          </h5>
                        </EuiTitle>
                        <EuiSpacer size={'m'} />
                        <EuiDescriptionList
                          compressed={true}
                          type="column"
                          listItems={formatToListItems(metadata.analytics_config)}
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
    {
      id: 'stats',
      name: (
        <FormattedMessage
          id="xpack.ml.inference.modelsList.expandedRow.statsTabLabel"
          defaultMessage="Stats"
        />
      ),
      content: (
        <>
          <EuiSpacer size={'m'} />
          {stats.inference_stats && (
            <>
              <EuiPanel>
                <EuiTitle size={'xs'}>
                  <h5>
                    <FormattedMessage
                      id="xpack.ml.inference.modelsList.expandedRow.inferenceStatsTitle"
                      defaultMessage="Inference stats"
                    />
                  </h5>
                </EuiTitle>
                <EuiSpacer size={'m'} />
                <EuiFlexGroup>
                  {formatToListItems(stats.inference_stats).map(({ title, description }) => (
                    <EuiFlexItem key={title}>
                      <EuiStat title={description} description={title} titleSize={'s'} />
                    </EuiFlexItem>
                  ))}
                </EuiFlexGroup>
              </EuiPanel>
              <EuiSpacer size={'m'} />
            </>
          )}
          {stats.ingest?.total && (
            <EuiPanel>
              <EuiTitle size={'xs'}>
                <h5>
                  <FormattedMessage
                    id="xpack.ml.inference.modelsList.expandedRow.ingestStatsTitle"
                    defaultMessage="Ingest stats"
                  />
                </h5>
              </EuiTitle>
              <EuiSpacer size={'m'} />
              <EuiFlexGroup>
                {formatToListItems(stats.ingest.total).map(({ title, description }) => (
                  <EuiFlexItem key={title}>
                    <EuiStat title={description} description={title} titleSize={'s'} />
                  </EuiFlexItem>
                ))}
              </EuiFlexGroup>

              {stats.ingest?.pipelines && (
                <>
                  <EuiSpacer size={'m'} />
                  <EuiTitle size={'xs'}>
                    <h5>
                      <FormattedMessage
                        id="xpack.ml.inference.modelsList.expandedRow.ingestStatsByPipelineTitle"
                        defaultMessage="Stats by pipeline"
                      />
                    </h5>
                  </EuiTitle>
                  {Object.entries(stats.ingest.pipelines).map(
                    ([pipelineName, { processors, ...pipelineStats }]) => {
                      return (
                        <Fragment key={pipelineName}>
                          <EuiTitle size={'xs'}>
                            <h5>{pipelineName}</h5>
                          </EuiTitle>
                          <EuiSpacer size={'m'} />
                          <EuiFlexGroup>
                            {formatToListItems(pipelineStats).map(({ title, description }) => (
                              <EuiFlexItem key={title}>
                                <EuiStat title={description} description={title} titleSize={'xs'} />
                              </EuiFlexItem>
                            ))}
                          </EuiFlexGroup>
                          <EuiSpacer size={'m'} />
                          <EuiTitle size={'xxs'}>
                            <h6>
                              <FormattedMessage
                                id="xpack.ml.inference.modelsList.expandedRow.processorsStatsTitle"
                                defaultMessage="Stats by processor"
                              />
                            </h6>
                          </EuiTitle>
                          {processors.map((processor) => {
                            const name = Object.keys(processor)[0];
                            const { stats: processorStats } = processor[name];
                            return (
                              <Fragment key={name}>
                                <EuiTitle size={'xxs'}>
                                  <h6>{name}</h6>
                                </EuiTitle>
                                <EuiFlexGroup>
                                  {formatToListItems(processorStats).map(
                                    ({ title, description }) => (
                                      <EuiFlexItem key={title}>
                                        <EuiStat
                                          title={description}
                                          description={title}
                                          titleSize={'xxs'}
                                        />
                                      </EuiFlexItem>
                                    )
                                  )}
                                </EuiFlexGroup>
                                <EuiSpacer size={'m'} />
                              </Fragment>
                            );
                          })}
                          <EuiSpacer size={'m'} />
                        </Fragment>
                      );
                    }
                  )}
                </>
              )}
            </EuiPanel>
          )}
        </>
      ),
    },
    ...(pipelines && Object.keys(pipelines).length > 0
      ? [
          {
            id: 'pipelines',
            name: (
              <>
                <FormattedMessage
                  id="xpack.ml.inference.modelsList.expandedRow.pipelinesTabLabel"
                  defaultMessage="Pipelines"
                />{' '}
                <EuiNotificationBadge>{stats.pipeline_count}</EuiNotificationBadge>
              </>
            ),
            content: (
              <>
                <EuiSpacer size={'m'} />
                <EuiFlexGrid columns={2} gutterSize={'m'}>
                  {Object.entries(pipelines).map(([pipelineName, { processors, description }]) => {
                    return (
                      <EuiFlexItem key={pipelineName}>
                        <EuiPanel>
                          <EuiTitle size={'xs'}>
                            <h5>{pipelineName}</h5>
                          </EuiTitle>
                          {description && <EuiText>{description}</EuiText>}
                          <EuiSpacer size={'m'} />
                          <EuiTitle size={'xxs'}>
                            <h6>
                              <FormattedMessage
                                id="xpack.ml.inference.modelsList.expandedRow.processorsTitle"
                                defaultMessage="Processors"
                              />
                            </h6>
                          </EuiTitle>
                          <EuiCodeBlock
                            language="painless"
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
                  })}
                </EuiFlexGrid>
              </>
            ),
          },
        ]
      : []),
  ];

  return (
    <EuiTabbedContent
      style={{ width: '100%' }}
      tabs={tabs}
      initialSelectedTab={tabs[0]}
      autoFocus="selected"
      onTabClick={(tab) => {}}
    />
  );
};
