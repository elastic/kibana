/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { XPackInfoProvider } from 'plugins/xpack_main/services/xpack_info';

import routes from 'ui/routes';
import template from 'plugins/reporting/views/management/jobs.html';

import { ReportListing } from '../../components/report_listing';
import { i18n } from '@kbn/i18n';
import { I18nProvider } from '@kbn/i18n/react';
import { MANAGEMENT_BREADCRUMB } from 'ui/management';

const REACT_ANCHOR_DOM_ELEMENT_ID = 'reportListingAnchor';

routes.when('/management/kibana/reporting', {
  template,
  k7Breadcrumbs: () => [
    MANAGEMENT_BREADCRUMB,
    {
      text: i18n.translate('xpack.reporting.breadcrumb', {
        defaultMessage: 'Reporting'
      })
    }
  ],
  controllerAs: 'jobsCtrl',
  controller($scope, kbnUrl, Private) {
    const xpackInfo = Private(XPackInfoProvider);

    $scope.$$postDigest(() => {
      const node = document.getElementById(REACT_ANCHOR_DOM_ELEMENT_ID);
      if (!node) {
        return;
      }

      render(
        <I18nProvider>
          <ReportListing
            badLicenseMessage={xpackInfo.get('features.reporting.management.message')}
            showLinks={xpackInfo.get('features.reporting.management.showLinks')}
            enableLinks={xpackInfo.get('features.reporting.management.enableLinks')}
            redirect={kbnUrl.redirect}
          />
        </I18nProvider>,
        node,
      );
    });

    $scope.$on('$destroy', () => {
      const node = document.getElementById(REACT_ANCHOR_DOM_ELEMENT_ID);
      if (node) {
        unmountComponentAtNode(node);
      }
    });
  }
});
