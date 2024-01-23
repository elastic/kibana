/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';
import { LinkButton } from '@kbn/security-solution-navigation/links';
import { ExternalPageName } from '../../navigation/links/constants';

const AddIntegrationButtonComponent: React.FC = () => (
  <LinkButton id={ExternalPageName.integrationsSecurity} fill className="step-paragraph">
    <FormattedMessage
      id="xpack.securitySolutionServerless.getStarted.togglePanel.configure.step3.description2.button"
      defaultMessage="Add integrations"
    />
  </LinkButton>
);

export const AddIntegrationButton = React.memo(AddIntegrationButtonComponent);
