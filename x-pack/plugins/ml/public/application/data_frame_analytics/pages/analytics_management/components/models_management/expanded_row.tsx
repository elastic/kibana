/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
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
} from '@elastic/eui';
import { ModelWithStats } from './models_list';

interface ExpandedRowProps {
  item: ModelWithStats;
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
  } = item;

  const details = {
    tags,
    version,
    estimated_operations,
    estimated_heap_memory_usage_bytes,
    default_field_map,
    license_level,
  };

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
              type="column"
              listItems={Object.entries(details).map(([title, value]) => ({
                title,
                description: typeof value === 'object' ? JSON.stringify(value) : value,
              }))}
            />
          </EuiPanel>
        </>
      ),
    },
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
          <EuiFlexGrid columns={2}>
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
                  type="column"
                  listItems={Object.entries(inferenceConfig[Object.keys(inferenceConfig)[0]]).map(
                    ([title, value]) => ({
                      title,
                      description:
                        typeof value === 'object' ? JSON.stringify(value) : (value as any),
                    })
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
                    type="column"
                    listItems={Object.entries(metadata?.analytics_config).map(([title, value]) => ({
                      title,
                      description:
                        typeof value === 'object' ? JSON.stringify(value) : (value as any),
                    }))}
                  />
                </EuiPanel>
              </EuiFlexItem>
            )}
          </EuiFlexGrid>
        </>
      ),
    },
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
          <EuiPanel>
            <EuiTitle size={'xs'}>
              <h5>
                <FormattedMessage
                  id="xpack.ml.inference.modelsList.expandedRow.statsTitle"
                  defaultMessage="Inference Stats"
                />
              </h5>
            </EuiTitle>
            <EuiSpacer size={'m'} />
            <EuiDescriptionList
              type="column"
              listItems={Object.entries(stats.inference_stats).map(([title, value]) => ({
                title,
                description: typeof value === 'object' ? JSON.stringify(value) : value,
              }))}
            />
          </EuiPanel>
        </>
      ),
    },
    ...(stats.pipeline_count > 0
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
                <EuiPanel>
                  <EuiTitle size={'xs'}>
                    <h5>
                      <FormattedMessage
                        id="xpack.ml.inference.modelsList.expandedRow.statsTitle"
                        defaultMessage="Inference Stats"
                      />
                    </h5>
                  </EuiTitle>
                  <EuiSpacer size={'m'} />
                  <EuiDescriptionList
                    type="column"
                    listItems={Object.entries(stats.inference_stats).map(([title, value]) => ({
                      title,
                      description: typeof value === 'object' ? JSON.stringify(value) : value,
                    }))}
                  />
                </EuiPanel>
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
