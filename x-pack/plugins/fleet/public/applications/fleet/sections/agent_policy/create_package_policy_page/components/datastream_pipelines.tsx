/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiBasicTable,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiTitle,
  EuiSpacer,
  EuiLink,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import type { PackageInfo } from '../../../../types';
import { useStartServices, useGetPipeline } from '../../../../hooks';
import {
  getPipelineNameForDatastream,
  getCustomPipelineNameForDatastream,
} from '../../../../../../../common/services';

import { usePackagePolicyEditorPageUrl } from './datastream_hooks';

export interface PackagePolicyEditorDatastreamPipelinesProps {
  packageInfo: PackageInfo;
  packageInputStream: { id?: string; data_stream: { dataset: string; type: string } };
}

interface PipelineItem {
  pipelineName: string;
  canEdit: boolean;
}

function toPipelineItem(pipelineName: string, canEdit = false): PipelineItem {
  return { pipelineName, canEdit };
}

function useDatastreamIngestPipelines(
  packageInfo: PackageInfo,
  dataStream: { dataset: string; type: string },
  pageUrl: string | null
) {
  const [addPipelineUrl, setAddPipelineUrl] = useState('');

  const { share } = useStartServices();
  const ingestPipelineLocator = share.url.locators.get('INGEST_PIPELINES_APP_LOCATOR');

  const defaultPipelineName = getPipelineNameForDatastream({
    dataStream,
    packageVersion: packageInfo.version,
  });

  const customPipelineName = getCustomPipelineNameForDatastream(dataStream);

  const res = useGetPipeline(customPipelineName);

  const pipelines: PipelineItem[] = useMemo(() => {
    if (res.data) {
      return [toPipelineItem(defaultPipelineName), toPipelineItem(customPipelineName, true)];
    }
    return [toPipelineItem(defaultPipelineName)];
  }, [defaultPipelineName, customPipelineName, res.data]);

  useEffect(() => {
    async function getUrl() {
      if (!ingestPipelineLocator) {
        return;
      }
      const createUrl = await ingestPipelineLocator.getUrl({
        page: 'pipeline_create',
      });
      setAddPipelineUrl(`${createUrl}?name=${customPipelineName}&redirect_path=${pageUrl}`);
    }

    getUrl();
  }, [customPipelineName, pageUrl, ingestPipelineLocator]);

  return {
    isLoading: res.isLoading,
    hasCustom: !res.isLoading && res.error?.statusCode !== 404,
    pipelines,
    addPipelineUrl,
  };
}

export const PackagePolicyEditorDatastreamPipelines: React.FunctionComponent<
  PackagePolicyEditorDatastreamPipelinesProps
> = ({ packageInputStream, packageInfo }) => {
  const dataStream = packageInputStream.data_stream;
  const { application, share, docLinks } = useStartServices();
  const ingestPipelineLocator = share.url.locators.get('INGEST_PIPELINES_APP_LOCATOR');

  const pageUrl = usePackagePolicyEditorPageUrl(packageInputStream.id);

  const { pipelines, addPipelineUrl, hasCustom, isLoading } = useDatastreamIngestPipelines(
    packageInfo,
    dataStream,
    pageUrl
  );

  if (!dataStream) {
    return null;
  }

  return (
    <EuiFlexGroup direction="column" gutterSize="xs" alignItems="flexStart">
      <EuiFlexItem grow={false}>
        <EuiTitle size="xxxs">
          <h5>
            <FormattedMessage
              id="xpack.fleet.packagePolicyEditor.datastreamIngestPipelinesTitle"
              defaultMessage="Ingest pipelines"
            />
          </h5>
        </EuiTitle>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText color="subdued" size="xs">
          <FormattedMessage
            id="xpack.fleet.packagePolicyEditor.datastreamIngestPipelinesLabel"
            defaultMessage="Ingest pipelines perform common transformations on the ingested data. We recommend modifying only the custom ingest pipeline. These pipelines are shared between integration policies of the same integration type. Hence, any modifications to the ingest pipelines would affect all the integration policies. {learnMoreLink}"
            values={{
              learnMoreLink: (
                <EuiLink href={docLinks.links.fleet.datastreams} external={true}>
                  <FormattedMessage
                    id="xpack.fleet.packagePolicyEdotpr.datastreamIngestPipelines.learnMoreLink"
                    defaultMessage="Learn more"
                  />
                </EuiLink>
              ),
            }}
          />
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiBasicTable
          loading={isLoading}
          items={pipelines}
          columns={[
            {
              field: 'pipelineName',
              name: '',
            },
            {
              width: '60px',
              actions: [
                {
                  icon: 'pencil',
                  type: 'icon',
                  description: i18n.translate(
                    'xpack.fleet.packagePolicyEditor.datastreamIngestPipelines.editBtn',
                    {
                      defaultMessage: 'Edit pipeline',
                    }
                  ),
                  'data-test-subj': 'datastreamEditPipelineBtn',
                  name: 'edit',
                  isPrimary: true,
                  onClick: async (el) => {
                    if (!ingestPipelineLocator) {
                      return;
                    }
                    const url = await ingestPipelineLocator.getUrl({
                      page: 'pipeline_edit',
                      pipelineId: el.pipelineName,
                    });

                    application.navigateToUrl(`${url}?redirect_path=${pageUrl}`);
                  },
                  available: ({ canEdit }) => canEdit,
                },
                {
                  icon: 'inspect',
                  type: 'icon',
                  description: i18n.translate(
                    'xpack.fleet.packagePolicyEditor.datastreamIngestPipelines.inspectBtn',
                    {
                      defaultMessage: 'Inspect pipeline',
                    }
                  ),
                  name: 'inspect',
                  'data-test-subj': 'datastreamInspectPipelineBtn',
                  isPrimary: true,
                  onClick: async (el) => {
                    if (!ingestPipelineLocator) {
                      return;
                    }
                    const url = await ingestPipelineLocator.getUrl({
                      page: 'pipeline_list',
                    });

                    application.navigateToUrl(
                      `${url}?pipeline=${el.pipelineName}&redirect_path=${pageUrl}`
                    );
                  },
                },
              ],
            },
          ]}
        />
      </EuiFlexItem>
      {!isLoading && !hasCustom && (
        <EuiFlexItem grow={false}>
          <EuiSpacer size="xs" />
          <EuiButtonEmpty
            size="xs"
            flush="left"
            iconType="plusInCircle"
            data-test-subj="datastreamAddCustomIngestPipelineBtn"
            href={addPipelineUrl}
          >
            <FormattedMessage
              id="xpack.fleet.packagePolicyEditor.datastreamIngestPipelines.addCustomButn"
              defaultMessage="Add custom pipeline"
            />
          </EuiButtonEmpty>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};
