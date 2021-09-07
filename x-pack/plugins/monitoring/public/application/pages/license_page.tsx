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
import { formatDateTimeLocal } from '../../../common/formatting';
import { Legacy } from '../../legacy_shims';

const CODE_PATHS = [CODE_PATH_ALL];

export const LicensePage: React.FC<{}> = () => {
  const title = i18n.translate('xpack.monitoring.license.licenseRouteTitle', {
    defaultMessage: 'License',
  });

  const state = useContext(GlobalStateContext);
  const { clusters, loaded } = useClusters(state.cluster_uuid, state.ccs, CODE_PATHS);

  // TODO how do we get timezone from here?
  // const timezone = injector.get('config').get('dateFormat:tz');
  const timezone = null;

  if (loaded) {
    const cluster = clusters[0];
    const isPrimaryCluster = cluster.isPrimary;
    const license = cluster.license;
    let expiryDate = license?.expiry_date_in_millis;

    if (expiryDate !== undefined) {
      // TODO pretty sure type definition is wrong, timezone should probably be string or null
      expiryDate = formatDateTimeLocal(expiryDate, false, timezone);
    }

    const isExpired = Date.now() > expiryDate;

    const basePath = Legacy.shims.getBasePath();
    // TODO /license_management/common/constants has no BASE_PATH, just hard code for now
    // this.uploadLicensePath = basePath + '/app/kibana#' + MANAGEMENT_BASE_PATH + 'upload_license';
    const uploadLicensePath = basePath + '/app/management/stack/license_management/upload_license';

    // TODO check expired case

    // TODO breadcrumbs should include the current cluster. Probably something that needs to happen in PageTemplate
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
