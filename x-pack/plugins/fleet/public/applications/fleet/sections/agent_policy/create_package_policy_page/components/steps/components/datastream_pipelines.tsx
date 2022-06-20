/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
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

import type { RegistryStream, PackageInfo } from '../../../../../../types';
import { getPipelineNameForDatastream } from '../../../../../../../../../common';

interface Props {
  packagePolicyId?: string;
  packageInfo: PackageInfo;
  packageInputStream: RegistryStream;
}

export const DatastreamPipeline: React.FunctionComponent<Props> = ({
  packagePolicyId,
  packageInputStream,
  packageInfo,
}) => {
  if (!packageInputStream.data_stream) {
    return null;
  }

  const defaultPipelineName = getPipelineNameForDatastream({
    dataStream: packageInputStream.data_stream,
    packageVersion: packageInfo.version,
  });

  return (
    <EuiFlexGroup direction="column" gutterSize="xs" alignItems="flexStart">
      <EuiFlexItem grow={false}>
        <EuiTitle size="xxxs">
          <h5>
            <FormattedMessage
              id="xpack.fleet.createPackagePolicy.datastreamIngestPipelinesTitle"
              defaultMessage={'Ingest pipelines'}
            />
          </h5>
        </EuiTitle>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText color="subdued" size="xs">
          <FormattedMessage
            id="xpack.fleet.createPackagePolicy.datastreamIngestPipelinesLabel"
            defaultMessage={
              'Ingest pipelines perform common transformations on the ingested data. We recommend modifying only the custom ingest pipeline. These pipelines are shared between integration policies of the same integration type. Hence, any modifications tot he ingest pipelines would affect all the integration policies. {learnMoreLink}'
            }
            values={{
              learnMoreLink: (
                <EuiLink href="#TODO" external={true}>
                  <FormattedMessage
                    id="xpack.fleet.packagePolicyEdotpr.datastreamIngestPipelines.learnMoreLink"
                    defaultMessage={'Learn more'}
                  />
                </EuiLink>
              ),
            }}
          />
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiBasicTable
          items={[{ label: defaultPipelineName }]}
          columns={[
            // @ts-ignore
            {
              field: 'label',
            },
            {
              width: '60px',
              actions: [
                {
                  icon: 'inspect',
                  type: 'icon',
                  description: 'test',
                  name: 'inspect',
                  isPrimary: true,
                  onClick: () => {},
                },
              ],
            },
          ]}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiSpacer size="xs" />
        <EuiButtonEmpty size="xs" flush="left" iconType="plusInCircle">
          <FormattedMessage
            id="xpack.fleet.packagePolicyEdotpr.datastreamIngestPipelines.addCustomButn"
            defaultMessage={'Add custom pipeline'}
          />
        </EuiButtonEmpty>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
