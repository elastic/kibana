/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { LinkButton } from '@kbn/security-solution-navigation/links';
import { ExternalPageName } from '../../navigation/links/constants';

const InstallAgentButtonComponent = () => (
  <LinkButton fill id={ExternalPageName.fleetAgents}>
    <FormattedMessage
      id="xpack.securitySolutionServerless.getStarted.togglePanel.configure.step2.description2.button"
      defaultMessage="Install Agent"
    />
  </LinkButton>
);

export const InstallAgentButton = React.memo(InstallAgentButtonComponent);
