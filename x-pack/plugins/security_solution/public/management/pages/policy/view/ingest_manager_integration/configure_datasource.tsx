/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiCallOut, EuiText, EuiTitle, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { LinkToApp } from '../../../../../common/components/endpoint/link_to_app';
import {
  CustomConfigureDatasourceContent,
  CustomConfigureDatasourceProps,
} from '../../../../../../../ingest_manager/public';
import { getPolicyDetailPath } from '../../../../common/routing';
import { MANAGEMENT_APP_ID } from '../../../../common/constants';

/**
 * Exports Endpoint-specific datasource configuration instructions
 * for use in the Ingest app create / edit datasource config
 */
export const ConfigureEndpointDatasource = memo<CustomConfigureDatasourceContent>(
  ({ from, datasourceId }: CustomConfigureDatasourceProps) => {
    let policyUrl = '';
    if (from === 'edit' && datasourceId) {
      policyUrl = getPolicyDetailPath(datasourceId);
    }

    return (
      <>
        <EuiTitle size="xs">
          <h4>
            <FormattedMessage
              id="xpack.securitySolution.endpoint.ingestManager.policyConfiguration"
              defaultMessage="Policy Configuration"
            />
          </h4>
        </EuiTitle>
        <EuiSpacer size="m" />
        <EuiCallOut
          data-test-subj={`endpointDatasourceConfig_${from === 'edit' ? 'edit' : 'create'}`}
          iconType="iInCircle"
          title={i18n.translate(
            'xpack.securitySolution.endpoint.ingestManager.policyConfiguration.calloutTitle',
            {
              defaultMessage: 'Manage Policy configuration in the Security app',
            }
          )}
        >
          <EuiText size="s">
            <p>
              {from === 'edit' ? (
                <>
                  <FormattedMessage
                    id="xpack.securitySolution.endpoint.ingestManager.editDatasource.endpointConfiguration"
                    defaultMessage="You can make changes to the Policy Configuration in the Security app. Fleet will deploy changes to your agents whenever your Policy changes."
                  />
                  <EuiSpacer />
                  <LinkToApp
                    data-test-subj="editLinkToPolicyDetails"
                    asButton={true}
                    appId={MANAGEMENT_APP_ID}
                    className="editLinkToPolicyDetails"
                    appPath={policyUrl}
                    // Cannot use formalUrl here since the code is called in Ingest, which does not use redux
                  >
                    <FormattedMessage
                      id="xpack.securitySolution.endpoint.ingestManager.editDatasource.configurePolicyLink"
                      defaultMessage="Configure Policy"
                    />
                  </LinkToApp>
                </>
              ) : (
                <FormattedMessage
                  id="xpack.securitySolution.endpoint.ingestManager.createDatasource.endpointConfiguration"
                  defaultMessage="Any agents that use this agent configuration will use a basic policy. You can make changes to this policy in the Security app, and Fleet will deploy those changes to your agents."
                />
              )}
            </p>
          </EuiText>
        </EuiCallOut>
      </>
    );
  }
);

ConfigureEndpointDatasource.displayName = 'ConfigureEndpointDatasource';
