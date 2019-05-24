/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { SFC } from 'react';

import { EuiTabbedContent } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { DataFrameJobListRow } from './common';
import { JobDetailsPane, SectionConfig } from './job_details_pane';
import { JobJsonPane } from './job_json_pane';

function getItemDescription(value: any) {
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }

  return value.toString();
}

interface Props {
  item: DataFrameJobListRow;
}

export const ExpandedRow: SFC<Props> = ({ item }) => {
  const state: SectionConfig = {
    title: 'State',
    items: Object.entries(item.state).map(s => {
      return { title: s[0].toString(), description: getItemDescription(s[1]) };
    }),
    position: 'left',
  };

  const stats: SectionConfig = {
    title: 'Stats',
    items: Object.entries(item.stats).map(s => {
      return { title: s[0].toString(), description: getItemDescription(s[1]) };
    }),
    position: 'right',
  };

  const tabs = [
    {
      id: 'job-details',
      name: i18n.translate('xpack.ml.dataframe.jobsList.jobDetails.tabs.jobSettingsLabel', {
        defaultMessage: 'Job details',
      }),
      content: <JobDetailsPane sections={[state, stats]} />,
    },
    {
      id: 'job-json',
      name: 'JSON',
      content: <JobJsonPane json={item.config} />,
    },
  ];
  return (
    <EuiTabbedContent
      size="s"
      tabs={tabs}
      initialSelectedTab={tabs[0]}
      onTabClick={() => {}}
      expand={false}
    />
  );
};
