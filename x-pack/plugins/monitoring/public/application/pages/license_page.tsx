/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useContext } from 'react';
import { i18n } from '@kbn/i18n';
import { PageTemplate } from './page_template';
import { PageLoading, License } from '../../components';
import { GlobalStateContext } from '../global_state_context';
import { useClusters } from '../hooks/use_clusters';
import { CODE_PATH_ALL } from '../../../common/constants';
import { Legacy } from '../../legacy_shims';
import { useKibana } from '../../../../../../src/plugins/kibana_react/public';

const CODE_PATHS = [CODE_PATH_ALL];

export const LicensePage: React.FC<{}> = () => {
  const title = i18n.translate('xpack.monitoring.license.licenseRouteTitle', {
    defaultMessage: 'License',
  });

  const state = useContext(GlobalStateContext);
  const { services } = useKibana<{ data: any }>();
  const { clusters, loaded } = useClusters(state.cluster_uuid, state.ccs, CODE_PATHS);

  const timezone = services.uiSettings.get('dateFormat:tz');

  if (loaded) {
    const cluster = clusters[0];
    const isPrimaryCluster = cluster.isPrimary;
    const license = cluster.license;
    let expiryDate = license?.expiry_date_in_millis;

    if (expiryDate !== undefined) {
      expiryDate = formatDateTimeLocal(expiryDate, timezone);
    }

    const isExpired = Date.now() > expiryDate;

    const uploadLicensePath = services.application.getUrlForApp('management', {
      path: 'stack/license_management/upload_license',
    });

    // TODO check expired case
    return (
      <PageTemplate title={title} pageTitle="">
        <License
          isPrimaryCluster={isPrimaryCluster}
          status={license.status}
          type={license.type}
          isExpired={isExpired}
          expiryDate={expiryDate}
          uploadLicensePath={uploadLicensePath}
        />
      </PageTemplate>
    );
  } else {
    return (
      <PageTemplate title={title} pageTitle={title}>
        <PageLoading />
      </PageTemplate>
    );
  }
};

// From x-pack/plugins/monitoring/common/formatting.ts with corrected typing
// TODO open github issue to correct other usages
export function formatDateTimeLocal(date: number | Date, timezone: string | null) {
  return moment.tz(date, timezone || moment.tz.guess()).format('LL LTS');
}
