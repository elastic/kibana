/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get, find } from 'lodash';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { Legacy } from '../../legacy_shims';
import { formatDateTimeLocal } from '../../../common/formatting';
import { BASE_PATH as MANAGEMENT_BASE_PATH } from '../../../../../plugins/license_management/common/constants';
import { License } from '../../components';

const REACT_NODE_ID = 'licenseReact';

export class LicenseViewController {
  constructor($injector, $scope) {
    Legacy.shims.timefilter.disableTimeRangeSelector();
    Legacy.shims.timefilter.disableAutoRefreshSelector();

    $scope.$on('$destroy', () => {
      unmountComponentAtNode(document.getElementById(REACT_NODE_ID));
    });

    this.init($injector, $scope, i18n);
  }

  init($injector, $scope) {
    const globalState = $injector.get('globalState');
    const title = $injector.get('title');
    const $route = $injector.get('$route');

    const cluster = find($route.current.locals.clusters, {
      cluster_uuid: globalState.cluster_uuid,
    });
    $scope.cluster = cluster;
    const routeTitle = i18n.translate('xpack.monitoring.license.licenseRouteTitle', {
      defaultMessage: 'License',
    });
    title($scope.cluster, routeTitle);

    this.license = cluster.license;
    this.isExpired = Date.now() > get(cluster, 'license.expiry_date_in_millis');
    this.isPrimaryCluster = cluster.isPrimary;

    const basePath = Legacy.shims.getBasePath();
    this.uploadLicensePath = basePath + '/app/kibana#' + MANAGEMENT_BASE_PATH + 'upload_license';

    this.renderReact($scope);
  }

  renderReact($scope) {
    const injector = Legacy.shims.getAngularInjector();
    const timezone = injector.get('config').get('dateFormat:tz');
    $scope.$evalAsync(() => {
      const { isPrimaryCluster, license, isExpired, uploadLicensePath } = this;
      let expiryDate = license.expiry_date_in_millis;
      if (license.expiry_date_in_millis !== undefined) {
        expiryDate = formatDateTimeLocal(license.expiry_date_in_millis, timezone);
      }

      // Mount the React component to the template
      render(
        <License
          isPrimaryCluster={isPrimaryCluster}
          status={license.status}
          type={license.type}
          isExpired={isExpired}
          expiryDate={expiryDate}
          uploadLicensePath={uploadLicensePath}
        />,
        document.getElementById(REACT_NODE_ID)
      );
    });
  }
}
