/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiPageTemplate } from '@elastic/eui';

export const ConnectorsHome: React.FC<{}> = ({ children }) => {
  return (
    <>
      <EuiPageTemplate.Header
        paddingSize="none"
        pageTitle={i18n.translate('xpack.triggersActionsUI.connectors.home.appTitle', {
          defaultMessage: 'Connectors',
        })}
        description={i18n.translate('xpack.triggersActionsUI.connectors.home.description', {
          defaultMessage: 'Connect third-party software with your alerting data.',
        })}
      />
      <EuiPageTemplate.Section paddingSize="none">{children}</EuiPageTemplate.Section>
    </>
  );
};
