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
  packageInputStream: RegistryStream & { data_stream: { dataset: string; type: string } };
}

export const DatastreamMappings: React.FunctionComponent<Props> = ({
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
              id="xpack.fleet.packagePolicyEditor.datastreamMappings.title"
              defaultMessage={'Mappings'}
            />
          </h5>
        </EuiTitle>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText color="subdued" size="xs">
          <FormattedMessage
            id="xpack.fleet.packagePolicyEditor.datastreamMappings.description"
            defaultMessage={
              'Mapping is the process of defining how a document, and the fields it contains, are stored and indexed. If you are adding new fields through custom ingest pipeline, we recommend addition of a mapping for those in the component template. {learnMoreLink}'
            }
            values={{
              learnMoreLink: (
                <EuiLink href="#TODO" external={true}>
                  <FormattedMessage
                    id="xpack.fleet.packagePolicyEditor.datastreamMappings.learnMoreLink"
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
          items={[{ label: defaultPipelineName + '@mappings' }]}
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
            id="xpack.fleet.packagePolicyEditor.datastreamMappings.addCustomButn"
            defaultMessage={'Add custom mappings'}
          />
        </EuiButtonEmpty>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
