/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { lazy } from 'react';
import { useKibana } from '../../common/services';

const EntityAnalyticsUpsellingLazy = lazy(
  () => import('@kbn/security-solution-upselling/pages/entity_analytics')
);

export const EntityAnalyticsUpsellingPage = () => {
  const { services } = useKibana();
  return (
    <EntityAnalyticsUpsellingLazy
      requiredLicense="Platinum"
      subscriptionUrl={services.application.getUrlForApp('management', {
        path: 'stack/license_management',
      })}
    />
  );
};
