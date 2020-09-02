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
  EuiHorizontalRule,
  EuiFlexGroup,
  EuiTextColor,
} from '@elastic/eui';
// @ts-ignore
import { formatDate } from '@elastic/eui/lib/services/format';
import { ModelItemFull } from './models_list';
import { TIME_FORMAT } from '../../../../../../../common/constants/time_format';

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
      .map(([title, value]) => {
        if (title.includes('timestamp')) {
          value = formatDate(value, TIME_FORMAT);
        }
        return { title, description: typeof value === 'object' ? JSON.stringify(value) : value };
      })
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
          <EuiFlexGrid columns={2}>
            {stats.inference_stats && (
              <EuiFlexItem>
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
                        id="xpack.ml.inference.modelsList.expandedRow.ingestStatsTitle"
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
                            id="xpack.ml.inference.modelsList.expandedRow.byPipelineTitle"
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
                                    id="xpack.ml.inference.modelsList.expandedRow.byProcessorTitle"
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
      size="s"
      style={{ width: '100%' }}
      tabs={tabs}
      initialSelectedTab={tabs[0]}
      autoFocus="selected"
      onTabClick={(tab) => {}}
    />
  );
};
