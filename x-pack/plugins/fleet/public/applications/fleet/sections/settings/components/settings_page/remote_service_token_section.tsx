/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSpacer, EuiTitle } from '@elastic/eui';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';

import { GenerateServiceTokenComponent } from '../../../../components';
import { useServiceToken } from '../../../../hooks';

export const RemoteServiceTokenSection: React.FunctionComponent<{}> = () => {
  const { serviceToken, isLoadingServiceToken, generateServiceToken } = useServiceToken();

  return (
    <>
      <EuiTitle size="s">
        <h4>
          <FormattedMessage
            id="xpack.fleet.settings.remoteServiceTokenTitle"
            defaultMessage="Remote service token"
          />
        </h4>
      </EuiTitle>
      <EuiSpacer size="xs" />
      <GenerateServiceTokenComponent
        serviceToken={serviceToken}
        generateServiceToken={generateServiceToken}
        isLoadingServiceToken={isLoadingServiceToken}
        isRemote={true}
      />
    </>
  );
};
