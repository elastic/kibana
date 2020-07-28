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
  startChecks,
} from '../../lib/elasticsearch_settings';
import { ModelUpdater } from './model_updater';
import { NoData } from '../../components';
import { CODE_PATH_LICENSE } from '../../../common/constants';
import { MonitoringViewBaseController } from '../base_controller';
import { i18n } from '@kbn/i18n';
import { Legacy } from '../../legacy_shims';

export class NoDataController extends MonitoringViewBaseController {
  constructor($injector, $scope) {
    window.injectorThree = $injector;
    const monitoringClusters = $injector.get('monitoringClusters');
    const $http = $injector.get('$http');
    const checkers = [new ClusterSettingsChecker($http), new NodeSettingsChecker($http)];

    const getData = async () => {
      let catchReason;
      try {
        const monitoringClustersData = await monitoringClusters(undefined, undefined, [
          CODE_PATH_LICENSE,
        ]);
        if (monitoringClustersData && monitoringClustersData.length) {
          window.history.replaceState(null, null, '#/home');
          return monitoringClustersData;
        }
      } catch (err) {
        if (err && err.status === 503) {
          catchReason = {
            property: 'custom',
            message: err.data.message,
          };
        }
      }

      this.errors.length = 0;
      if (catchReason) {
        this.reason = catchReason;
      } else if (!this.isCollectionEnabledUpdating && !this.isCollectionIntervalUpdating) {
        /**
         * `no-use-before-define` is fine here, since getData is an async function.
         * Needs to be done this way, since there is no `this` before super is executed
         * */
        await startChecks(checkers, updateModel); // eslint-disable-line no-use-before-define
      }
    };

    super({
      title: i18n.translate('xpack.monitoring.noData.routeTitle', {
        defaultMessage: 'Setup Monitoring',
      }),
      getPageData: async () => await getData(),
      reactNodeId: 'noDataReact',
      $scope,
      $injector,
    });
    Object.assign(this, this.getDefaultModel());

    //Need to set updateModel after super since there is no `this` otherwise
    const { updateModel } = new ModelUpdater($scope, this);
    const enabler = new Enabler($http, updateModel);
    $scope.$watch(
      () => this,
      () => {
        if (this.isCollectionEnabledUpdated && !this.reason) {
          return;
        }
        this.render(enabler);
      },
      true
    );
  }

  getDefaultModel() {
    return {
      errors: [], // errors can happen from trying to check or set ES settings
      checkMessage: null, // message to show while waiting for api response
      isLoading: true, // flag for in-progress state of checking for no data reason
      isCollectionEnabledUpdating: false, // flags to indicate whether to show a spinner while waiting for ajax
      isCollectionEnabledUpdated: false,
      isCollectionIntervalUpdating: false,
      isCollectionIntervalUpdated: false,
    };
  }

  render(enabler) {
    const props = this;
    this.renderReact(<NoData {...props} enabler={enabler} isCloudEnabled={Legacy.shims.isCloud} />);
  }
}
