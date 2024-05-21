/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { withSuspenseUpsell } from '@kbn/security-solution-upselling/helpers';
import React, { lazy } from 'react';
import { useKibana } from '../../common/services';
import * as i18n from './translations';

const EntityAnalyticsUpsellingSectionLazy = withSuspenseUpsell(
  lazy(() =>
    import('@kbn/security-solution-upselling/sections/entity_analytics').then(
      ({ EntityAnalyticsUpsellingSection }) => ({
        default: EntityAnalyticsUpsellingSection,
      })
    )
  )
);

export const EntityAnalyticsUpsellingSection = () => {
  const { services } = useKibana();
  const requiredLicense = 'Platinum';
  return (
    <EntityAnalyticsUpsellingSectionLazy
      upgradeMessage={i18n.UPGRADE_LICENSE_MESSAGE(requiredLicense ?? '')}
      upgradeHref={services.application.getUrlForApp('management', {
        path: 'stack/license_management',
      })}
      upgradeToLabel={requiredLicense}
    />
  );
};
