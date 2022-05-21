/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLink } from '@elastic/eui';
import { capitalize } from 'lodash';
import React from 'react';
import { RelatedIntegration } from '../../../../common/detection_engine/schemas/common';

export const getIntegrationLink = (integration: RelatedIntegration, basePath: string) => {
  const integrationURL = `${basePath}/app/integrations/detail/${integration.package}-${
    integration.version
  }/overview${integration.integration ? `?integration=${integration.integration}` : ''}`;
  return (
    <EuiLink href={integrationURL} target="_blank">
      {`${capitalize(integration.package)} ${capitalize(integration.integration)}`}
    </EuiLink>
  );
};
