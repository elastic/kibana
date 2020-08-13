/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiDescriptionList, EuiPanel, EuiSpacer, EuiTabbedContent, EuiTitle } from '@elastic/eui';
import { ModelWithStats } from './models_list';

interface ExpandedRowProps {
  item: ModelWithStats;
}

export const ExpandedRow: FC<ExpandedRowProps> = ({ item }) => {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  const { model_id, create_time, created_by, inference_config, stats, ...details } = item;

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
          <EuiPanel>
            <EuiTitle size={'xs'}>
              <h5>
                <FormattedMessage
                  id="xpack.ml.inference.modelsList.expandedRow.inferenceConfigTitle"
                  defaultMessage="Inference configuration"
                />
              </h5>
            </EuiTitle>
            <EuiDescriptionList
              type="column"
              listItems={Object.entries(inference_config).map(([title, value]) => ({
                title,
                description: typeof value === 'object' ? JSON.stringify(value) : value,
              }))}
            />
          </EuiPanel>
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
