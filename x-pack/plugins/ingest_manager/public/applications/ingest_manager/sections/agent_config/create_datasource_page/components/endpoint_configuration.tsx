/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { useLocation } from 'react-router-dom';
import { EuiLink } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useCore } from './../../../../hooks/use_core';

export const EndpointConfiguration = memo<{ editMode: boolean }>(({ editMode }) => {
  const { application } = useCore();
  const pathname = useLocation().pathname.split('/');
  const policyId = pathname[pathname.length - 1];
  const appId = 'siem';
  const appPath = `#/policy/${policyId}`;
  const linkToSiemApp = (event: React.MouseEvent<HTMLButtonElement | HTMLAnchorElement>) => {
    event.preventDefault();
    application.navigateToApp(appId, { path: appPath });
  };

  return (
    <>
      {editMode === true ? (
        <>
          <FormattedMessage
            id="xpack.ingestManager.editDatasource.stepConfigure.endpointConfiguration"
            defaultMessage="See security app policy tab for additional configuration options: "
          />
          <EuiLink
            onClick={(ev: React.MouseEvent<HTMLButtonElement | HTMLAnchorElement>) =>
              linkToSiemApp(ev)
            }
          >
            {i18n.translate(
              'xpack.ingestManager.editDatasource.stepConfigure.endpointConfigurationLink',
              { defaultMessage: 'Click me to configure' }
            )}
          </EuiLink>
        </>
      ) : (
        <FormattedMessage
          id="xpack.ingestManager.createDatasource.stepConfigure.endpointConfiguration"
          defaultMessage="See security app policy tab for additional configuration"
        />
      )}
    </>
  );
});
