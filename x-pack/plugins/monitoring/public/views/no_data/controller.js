/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import {
  ClusterSettingsChecker,
  NodeSettingsChecker,
  Enabler,
  startChecks
} from 'plugins/monitoring/lib/elasticsearch_settings';
import { ModelUpdater } from './model_updater';
import { render, unmountComponentAtNode } from 'react-dom';
import { NoData } from 'plugins/monitoring/components';
import { timefilter } from 'ui/timefilter';
import { I18nContext } from 'ui/i18n';
import 'ui/listen';

const REACT_NODE_ID_NO_DATA = 'noDataReact';

export class NoDataController {
  constructor($injector, $scope) {
    const $executor = $injector.get('$executor');
    this.enableTimefilter($executor, $scope);
    this.registerCleanup($scope, $executor);

    Object.assign(this, this.getDefaultModel());
    this.start($scope, $injector, $executor);
  }

  getDefaultModel() {
    return {
      hasData: false, // control flag to control a redirect
      errors: [], // errors can happen from trying to check or set ES settings
      checkMessage: null, // message to show while waiting for api response
      isLoading: true, // flag for in-progress state of checking for no data reason
      isCollectionEnabledUpdating: false, // flags to indicate whether to show a spinner while waiting for ajax
      isCollectionEnabledUpdated: false,
      isCollectionIntervalUpdating: false,
      isCollectionIntervalUpdated: false
    };
  }

  /*
   * Start the page logic of observing scope changes, and changes to the data model.
   * @param {Object} $scope Angular $scope of the view controller
   * @param {Object} $injector Angular $injector service
   * @param {Object} $executor Kibana $executor service for Angular
   */
  start($scope, $injector, $executor) {
    const model = this;

    const $http = $injector.get('$http');
    const kbnUrl = $injector.get('kbnUrl');
    const monitoringClusters = $injector.get('monitoringClusters');

    const { updateModel } = new ModelUpdater($scope, model);
    const checkers = [
      new ClusterSettingsChecker($http),
      new NodeSettingsChecker($http)
    ];
    const enabler = new Enabler($http, updateModel);

    $scope.$$postDigest(() => {
      startChecks(checkers, updateModel); // Start the checkers that use APIs for finding the reason for no data
    });

    $scope.$watch(
      () => model,
      props => {
        render(
          <I18nContext>
            <NoData {...props} enabler={enabler} />
          </I18nContext>,
          document.getElementById(REACT_NODE_ID_NO_DATA)
        );
      },
      true // deep watch
    );

    $scope.$watch(
      () => model.hasData,
      hasData => {
        if (hasData) {
          kbnUrl.redirect('/home'); // redirect if to cluster overview if data is found from background refreshes
        }
      }
    );

    // register the monitoringClusters service.
    $executor.register({
      execute: () => monitoringClusters(),
      handleResponse: clusters => {
        if (clusters.length) {
          model.hasData = true; // use the control flag because we can't redirect from inside here
        }
      }
    });

    $executor.start($scope); // start the executor to keep refreshing the search for data
  }

  enableTimefilter($executor, $scope) {
    timefilter.enableTimeRangeSelector();
    timefilter.enableAutoRefreshSelector();
    $scope.$listen(timefilter, 'timeUpdate', () => $executor.run()); // re-fetch if they change the time filter
  }

  registerCleanup($scope, $executor) {
    // destroy the executor, unmount the react component
    $scope.$on('$destroy', () => {
      $executor.destroy();
      unmountComponentAtNode(document.getElementById(REACT_NODE_ID_NO_DATA));
    });
  }
}
