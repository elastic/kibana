/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { lazy } from 'react';
import { useKibana } from '../../common/services';
import * as i18n from '../translations';

const EntityAnalyticsUpsellingLazy = lazy(
  () => import('@kbn/security-solution-upselling/pages/entity_analytics')
);

export const EntityAnalyticsUpsellingPage = () => {
  const { services } = useKibana();
  const requiredLicense = 'Platinum';

  return (
    <EntityAnalyticsUpsellingLazy
      upgradeMessage={i18n.UPGRADE_LICENSE_MESSAGE(requiredLicense ?? '')}
      upgradeHref={services.application.getUrlForApp('management', {
        path: 'stack/license_management',
      })}
      upgradeToLabel={requiredLicense}
    />
  );
};
