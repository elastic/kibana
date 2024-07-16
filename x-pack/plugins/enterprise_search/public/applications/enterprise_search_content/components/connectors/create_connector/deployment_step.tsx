/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

// import { useLocation } from 'react-router-dom';

import { ConnectorDeployment } from '../../connector_detail/deployment';

// import { FormattedMessage } from '@kbn/i18n-react';

interface DeploymentStepProps {
  title: string;
}

export const DeploymentStep: React.FC<DeploymentStepProps> = ({ title }) => {
  return <ConnectorDeployment />;
};
