/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiEmptyPrompt, EuiText } from '@elastic/eui';
import { useKibana } from '../../../../../../../../../src/plugins/kibana_react/public';
import { LinkToApp } from '../../../../../common/components/endpoint/link_to_app';
import {
  CustomConfigureDatasourceContent,
  CustomConfigureDatasourceProps,
  NewDatasource,
} from '../../../../../../../ingest_manager/public';
import { getManagementUrl } from '../../../..';

type DatasourceWithId = NewDatasource & { id: string };

/**
 * Exports Endpoint-specific datasource configuration instructions
 * for use in the Ingest app create / edit datasource config
 */
export const ConfigureEndpointDatasource = memo<CustomConfigureDatasourceContent>(
  ({
    from,
    datasource,
  }: {
    from: string;
    datasource: CustomConfigureDatasourceProps['datasource'];
  }) => {
    const { services } = useKibana();
    let policyUrl = '';
    if (from === 'edit') {
      policyUrl = getManagementUrl({
        name: 'policyDetails',
        policyId: (datasource as DatasourceWithId).id,
      });
    }

    return (
      <EuiEmptyPrompt
        body={
          <EuiText>
            <p>
              {from === 'edit' ? (
                <LinkToApp
                  appId="siem"
                  appPath={policyUrl}
                  href={`${services.application.getUrlForApp('siem')}${policyUrl}`}
                >
                  <FormattedMessage
                    id="xpack.securitySolution.endpoint.ingestManager.editDatasource.stepConfigure"
                    defaultMessage="View and configure Security Policy"
                  />
                </LinkToApp>
              ) : (
                <FormattedMessage
                  id="xpack.securitySolution.endpoint.ingestManager.createDatasource.stepConfigure"
                  defaultMessage="The recommended Security Policy has been associated with this data source. The Security Policy can be edited in the Security application once your data source has been saved."
                />
              )}
            </p>
          </EuiText>
        }
      />
    );
  }
);

ConfigureEndpointDatasource.displayName = 'ConfigureEndpointDatasource';
