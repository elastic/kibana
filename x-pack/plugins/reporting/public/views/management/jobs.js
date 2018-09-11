/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import 'plugins/reporting/less/main.less';
import { XPackInfoProvider } from 'plugins/xpack_main/services/xpack_info';

import routes from 'ui/routes';
import template from 'plugins/reporting/views/management/jobs.html';

import { ReportListing } from '../../components/report_listing';

const REACT_ANCHOR_DOM_ELEMENT_ID = 'reportListingAnchor';

routes.when('/management/kibana/reporting', {
  template,
  controllerAs: 'jobsCtrl',
  controller($scope, kbnUrl, Private) {
    const xpackInfo = Private(XPackInfoProvider);

    $scope.$$postDigest(() => {
      const node = document.getElementById(REACT_ANCHOR_DOM_ELEMENT_ID);
      if (!node) {
        return;
      }

      render(
        <ReportListing
          xpackInfo={xpackInfo}
          kbnUrl={kbnUrl}
        />,
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
