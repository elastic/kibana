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
} from '../../../../../../../ingest_manager/public';
import { getPolicyDetailPath } from '../../../../common/routing';

/**
 * Exports Endpoint-specific datasource configuration instructions
 * for use in the Ingest app create / edit datasource config
 */
export const ConfigureEndpointDatasource = memo<CustomConfigureDatasourceContent>(
  ({ from, datasourceId }: CustomConfigureDatasourceProps) => {
    const { services } = useKibana();
    let policyUrl = '';
    if (from === 'edit' && datasourceId) {
      policyUrl = getPolicyDetailPath(datasourceId);
    }

    return (
      <EuiEmptyPrompt
        data-test-subj={`endpointDatasourceConfig_${from === 'edit' ? 'edit' : 'create'}`}
        body={
          <EuiText>
            <p>
              {from === 'edit' ? (
                <LinkToApp
                  appId="securitySolution"
                  appPath={policyUrl}
                  href={`${services.application.getUrlForApp('securitySolution')}${policyUrl}`}
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
