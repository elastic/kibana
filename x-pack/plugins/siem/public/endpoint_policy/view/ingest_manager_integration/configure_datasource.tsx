/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo } from 'react';
import { useLocation } from 'react-router-dom';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiEmptyPrompt, EuiText } from '@elastic/eui';
import { CustomConfigureDatasourceContent } from '../../../../../ingest_manager/public';
import { LinkToApp } from '../../../common/components/endpoint/link_to_app';
import { useKibana } from '../../../../../../../src/plugins/kibana_react/public';

export const ConfigureEndpointDatasource = memo<CustomConfigureDatasourceContent>(
  ({ from }: { from: string }) => {
    const pathname = useLocation().pathname.split('/');
    const policyId = pathname[pathname.length - 1];

    return (
      <EuiEmptyPrompt
        body={
          <EuiText>
            <p>
              {from === 'edit' ? (
                <LinkToApp
                  appId="siem"
                  appPath={`#/policy/${policyId}`}
                  href={`siem#/policy/${policyId}`}
                >
                  <FormattedMessage
                    id="xpack.endpoint.ingestManager.editDatasource.stepConfigure"
                    defaultMessage="View and configure Security Policy"
                  />
                </LinkToApp>
              ) : (
                <FormattedMessage
                  id="xpack.endpoint.ingestManager.createDatasource.stepConfigure"
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
