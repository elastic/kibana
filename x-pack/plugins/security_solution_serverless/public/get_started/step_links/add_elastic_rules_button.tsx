/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';
import { LinkButton } from '@kbn/security-solution-navigation/links';
import { SecurityPageName } from '@kbn/security-solution-navigation';

const AddElasticRulesButtonComponent = () => (
  <LinkButton id={SecurityPageName.rules} fill>
    <FormattedMessage
      id="xpack.securitySolutionServerless.getStarted.togglePanel.configure.step4.description2.button"
      defaultMessage="Add Elastic rules"
    />
  </LinkButton>
);

export const AddElasticRulesButton = React.memo(AddElasticRulesButtonComponent);
