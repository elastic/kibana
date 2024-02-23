/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBasicTable, EuiBasicTableColumn, EuiEmptyPrompt, EuiLink } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import React, { useEffect, useState } from 'react';
import { ClientPluginsStart } from '../../../../../plugin';
import { useSyntheticsSettingsContext } from '../../../contexts';
import { DslData, useGetDslStatus } from '../hooks/use_get_dsl_status';

const ErrorEmptyPrompt = ({ error }: { error?: string }) => (
  <EuiEmptyPrompt
    iconType="error"
    body={
      <p>
        {error ??
          i18n.translate('xpack.synthetics.dslRetention.emptyErrorPrompt', {
            defaultMessage: 'No further error information available',
          })}
      </p>
    }
    color="danger"
    title={
      <h2>
        <FormattedMessage
          id="xpack.synthetics.dslRetention.noData.heading"
          defaultMessage="No data retention information found"
        />
      </h2>
    }
  />
);

function useManagementLocator(extraPath?: string) {
  const [templatePath, setTemplatePath] = useState<string | null>(null);
  const { basePath } = useSyntheticsSettingsContext();
  const { share, application } = useKibana<ClientPluginsStart>().services;
  const canManageIndices = !!application.capabilities.management?.data?.index_management;
  useEffect(() => {
    if (!canManageIndices) return;
    const managementLocator = share.url.locators.get('MANAGEMENT_APP_LOCATOR');
    managementLocator
      ?.getLocation({ sectionId: 'data', appId: 'index_management' })
      .then(({ app, path }) => setTemplatePath(`${basePath}/app/${app}${path}${extraPath}`));
  }, [share.url.locators, basePath, setTemplatePath, canManageIndices, extraPath]);
  return templatePath;
}

function DataStreamLink({ dataStream, name }: { dataStream: string; name: string }) {
  const templatePath = useManagementLocator(`/data_streams/${dataStream}`);

  if (templatePath === null) return <>{name}</>;
  return (
    <EuiLink
      href={templatePath}
      target="_blank"
      data-test-subj={`xpack.synthetics.dslRetention.indexTemplateLink.${name}`}
    >
      {name}
    </EuiLink>
  );
}

function IndexTemplateLabel({ indexTemplateName }: { indexTemplateName: string }) {
  const templatePath = useManagementLocator(`/templates/${indexTemplateName}`);

  if (templatePath === null) return <>{indexTemplateName}</>;
  return (
    <EuiLink
      href={templatePath}
      target="_blank"
      data-test-subj={`xpack.synthetics.dslRetention.indexTemplateLink.${indexTemplateName}`}
    >
      {indexTemplateName}
    </EuiLink>
  );
}

export const DslRetentionTab = () => {
  const { dslData, loading, error } = useGetDslStatus();
  if (loading === false && dslData === undefined)
    return <ErrorEmptyPrompt error={error?.message} />;

  const columns: Array<EuiBasicTableColumn<DslData>> = [
    {
      field: 'name',
      name: i18n.translate('xpack.synthetics.dslRetention.columns.name', {
        defaultMessage: 'Dataset',
      }),
      render: (name: string, { dataStreamName }: DslData) => {
        if (!dataStreamName) {
          return name;
        }
        return <DataStreamLink dataStream={dataStreamName} name={name} />;
      },
    },
    {
      field: 'storageSize',
      name: i18n.translate('xpack.synthetics.dslRetention.columns.currentSize', {
        defaultMessage: 'Current size',
      }),
    },
    {
      field: 'lifecycle.data_retention',
      name: i18n.translate('xpack.synthetics.dslRetention.columns.retentionPeriod', {
        defaultMessage: 'Retention period',
      }),
    },
    {
      field: 'indexTemplateName',
      name: i18n.translate('xpack.synthetics.dslRetention.columns.indexTemplateName', {
        defaultMessage: 'Index template',
      }),
      render: (indexTemplateName: string) => (
        <IndexTemplateLabel indexTemplateName={indexTemplateName} />
      ),
    },
  ];

  return (
    <EuiBasicTable
      items={dslData ?? []}
      loading={loading === true && dslData === undefined}
      noItemsMessage={
        loading === false && dslData === [] ? (
          <FormattedMessage
            id="xpack.synthetics.dslRetention.noData"
            defaultMessage="No retention data found"
          />
        ) : undefined
      }
      columns={columns}
      tableLayout="auto"
    />
  );
};
