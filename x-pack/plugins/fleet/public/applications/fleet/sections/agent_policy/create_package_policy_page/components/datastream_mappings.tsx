/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBasicTable, EuiFlexGroup, EuiFlexItem, EuiText, EuiTitle, EuiLink } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';

import type { PackageInfo } from '../../../../types';
import { getComponentTemplateNameForDatastream } from '../../../../../../../common/services';
import { useStartServices } from '../../../../hooks';

import { usePackagePolicyEditorPageUrl } from './datastream_hooks';

export interface PackagePolicyEditorDatastreamMappingsProps {
  packageInfo: PackageInfo;
  packageInputStream: { id?: string; data_stream: { dataset: string; type: string } };
}

function useComponentTemplates(dataStream: { dataset: string; type: string }) {
  return [
    {
      templateName: getComponentTemplateNameForDatastream(dataStream, '@package'),
    },
    {
      templateName: getComponentTemplateNameForDatastream(dataStream, '@custom'),
      canEdit: true,
    },
  ];
}

export const PackagePolicyEditorDatastreamMappings: React.FunctionComponent<
  PackagePolicyEditorDatastreamMappingsProps
> = ({ packageInputStream, packageInfo }) => {
  const dataStream = packageInputStream.data_stream;
  const pageUrl = usePackagePolicyEditorPageUrl(packageInputStream.id);

  const { application, docLinks } = useStartServices();
  const componentTemplateItems = useComponentTemplates(dataStream);

  return (
    <EuiFlexGroup direction="column" gutterSize="xs" alignItems="flexStart">
      <EuiFlexItem grow={false}>
        <EuiTitle size="xxxs">
          <h5>
            <FormattedMessage
              id="xpack.fleet.packagePolicyEditor.datastreamMappings.title"
              defaultMessage="Mappings"
            />
          </h5>
        </EuiTitle>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText color="subdued" size="xs">
          <FormattedMessage
            id="xpack.fleet.packagePolicyEditor.datastreamMappings.description"
            defaultMessage="Mapping is the process of defining how a document, and the fields it contains, are stored and indexed. If you are adding new fields through custom ingest pipeline, we recommend addition of a mapping for those in the component template. {learnMoreLink}"
            values={{
              learnMoreLink: (
                <EuiLink href={docLinks.links.fleet.datastreams} external={true}>
                  <FormattedMessage
                    id="xpack.fleet.packagePolicyEditor.datastreamMappings.learnMoreLink"
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
          items={componentTemplateItems}
          columns={[
            {
              field: 'templateName',
              name: '',
            },
            {
              width: '60px',
              actions: [
                {
                  icon: 'pencil',
                  type: 'icon',
                  description: i18n.translate(
                    'xpack.fleet.packagePolicyEditor.datastreamMappings.editBtn',
                    {
                      defaultMessage: 'Edit mappings',
                    }
                  ),
                  'data-test-subj': 'datastreamEditMappingsBtn',
                  name: 'edit',
                  isPrimary: true,
                  onClick: async (el) => {
                    const url = application.getUrlForApp('management', {
                      path: `/data/index_management/edit_component_template/${el.templateName}`,
                    });

                    application.navigateToUrl(`${url}?step=mappings&redirect_path=${pageUrl}`);
                  },
                  available: ({ canEdit }) => !!canEdit,
                },
                {
                  icon: 'inspect',
                  type: 'icon',
                  description: i18n.translate(
                    'xpack.fleet.packagePolicyEditor.datastreamMappings.inspectBtn',
                    {
                      defaultMessage: 'Inspect mappings',
                    }
                  ),
                  name: 'inspect',
                  'data-test-subj': 'datastreamInspectMappingsBtn',
                  isPrimary: true,
                  onClick: async (el) => {
                    const url = application.getUrlForApp('management', {
                      path: `/data/index_management/component_templates/${el.templateName}`,
                    });

                    application.navigateToUrl(`${url}?redirect_path=${pageUrl}`);
                  },
                },
              ],
            },
          ]}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
