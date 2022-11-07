/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBasicTable, EuiCallOut, EuiLink, EuiSpacer, EuiText } from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { PolicyLink } from './policy_link';
import { useGetIlmPolicies } from './hooks/use_get_ilm_policies';

export const DataRetentionTab = () => {
  const { data } = useGetIlmPolicies();

  const columns = [
    {
      field: 'label',
      name: i18n.translate('xpack.synthetics.settingsRoute.table.dataset', {
        defaultMessage: 'Dataset',
      }),
    },
    {
      field: 'currentSize',
      name: i18n.translate('xpack.synthetics.settingsRoute.table.currentSize', {
        defaultMessage: 'Current size',
      }),
      truncateText: true,
      render: (name: string, _item: typeof data[0]) => <EuiText>{name}</EuiText>,
    },
    {
      field: 'retentionPeriod',
      name: i18n.translate('xpack.synthetics.settingsRoute.table.retentionPeriod', {
        defaultMessage: 'Retention period',
      }),
    },
    {
      field: 'name',
      name: i18n.translate('xpack.synthetics.settingsRoute.table.policy', {
        defaultMessage: 'Policy',
      }),
      render: (name: string) => <PolicyLink name={name} />,
    },
  ];

  return (
    <div>
      <EuiCallOut title={CALLOUT_TITLE} iconType="iInCircle">
        <p>{CALLOUT_DESCRIPTION}</p>
        <p>
          {FOR_MORE_INFO}
          <EuiLink href="https://www.elastic.co/guide/en/observability/current/synthetics-manage-retention.html">
            {READ_OUR_DOCS}
          </EuiLink>
          .
        </p>
      </EuiCallOut>
      <EuiSpacer size="m" />
      <EuiBasicTable
        tableCaption={RETENTION_TABLE}
        items={data}
        columns={columns}
        tableLayout="auto"
      />
    </div>
  );
};

const CALLOUT_TITLE = i18n.translate('xpack.synthetics.settingsRoute.retentionCalloutTitle', {
  defaultMessage: 'Synthetics data is configured by managed index lifecycle policies',
});

const CALLOUT_DESCRIPTION = i18n.translate(
  'xpack.synthetics.settingsRoute.retentionCalloutDescription',
  {
    defaultMessage:
      'To change your data retention settings, we recommend creating your own index lifecycle\n' +
      '          policy and attaching it to the relevant custom Component Template in Stack Management.',
  }
);

const FOR_MORE_INFO = i18n.translate('xpack.synthetics.settingsRoute.forMoreInfo', {
  defaultMessage: 'For more information,',
});

const READ_OUR_DOCS = i18n.translate('xpack.synthetics.settingsRoute.readDocs', {
  defaultMessage: 'read our documentation.',
});

const RETENTION_TABLE = i18n.translate('xpack.synthetics.settingsRoute.tableCaption', {
  defaultMessage: 'Synthetics data retention policies',
});
