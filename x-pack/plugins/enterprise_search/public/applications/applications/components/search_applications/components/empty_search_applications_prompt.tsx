/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, PropsWithChildren } from 'react';

import { EuiEmptyPrompt } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

export const EmptySearchApplicationsPrompt: FC<PropsWithChildren<unknown>> = ({ children }) => {
  return (
    <EuiEmptyPrompt
      iconType="aggregate"
      title={
        <h2>
          <FormattedMessage
            id="xpack.enterpriseSearch.searchApplications.list.empty.title"
            defaultMessage="Create your first Search Application"
          />
        </h2>
      }
      body={
        <p>
          <FormattedMessage
            id="xpack.enterpriseSearch.searchApplications.list.empty.description"
            defaultMessage="Let's walk you through creating your first Search Application."
          />
        </p>
      }
      actions={children}
    />
  );
};
