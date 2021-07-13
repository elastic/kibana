/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import moment from 'moment';
import { render, unmountComponentAtNode } from 'react-dom';
import { getPageData } from '../lib/get_page_data';
import { PageLoading } from '../components';
import { Legacy } from '../legacy_shims';
import { PromiseWithCancel } from '../../common/cancel_promise';
import { SetupModeFeature } from '../../common/enums';
import { updateSetupModeData, isSetupModeFeatureEnabled } from '../lib/setup_mode';
import { AlertsContext } from '../alerts/context';
import { KibanaContextProvider } from '../../../../../src/plugins/kibana_react/public';
import { AlertsDropdown } from '../alerts/alerts_dropdown';
import { HeaderMenuPortal } from '../../../observability/public';

/**
 * Given a timezone, this function will calculate the offset in milliseconds
 * from UTC time.
 *
 * @param {string} timezone
 */
const getOffsetInMS = (timezone) => {
  if (timezone === 'Browser') {
    return 0;
  }
  const offsetInMinutes = moment.tz(timezone).utcOffset();
  const offsetInMS = offsetInMinutes * 1 * 60 * 1000;
  return offsetInMS;
};

/**
 * Class to manage common instantiation behaviors in a view controller
 *
 * This is expected to be extended, and behavior enabled using super();
 *
 * Example:
 * uiRoutes.when('/myRoute', {
 *   template: importedTemplate,
 *   controllerAs: 'myView',
 *   controller: class MyView extends MonitoringViewBaseController {
 *     constructor($injector, $scope) {
 *       super({
 *         title: 'Hello World',
 *         api: '../api/v1/monitoring/foo/bar',
 *         defaultData,
 *         reactNodeId,
 *         $scope,
 *         $injector,
 *         options: {
 *           enableTimeFilter: false // this will have just the page auto-refresh control show
 *         }
 *       });
 *     }
 *   }
 * });
 */
export class MonitoringViewBaseController {
  /**
   * Create a view controller
   * @param {String} title - Title of the page
   * @param {String} api - Back-end API endpoint to poll for getting the page
   *    data using POST and time range data in the body. Whenever possible, use
   *    this method for data polling rather than supply the getPageData param.
   * @param {Function} apiUrlFn - Function that returns a string for the back-end
   *    API endpoint, in case the string has dynamic query parameters (e.g.
   *    show_system_indices) rather than supply the getPageData param.
   * @param {Function} getPageData - (Optional) Function to fetch page data, if
   *    simply passing the API string isn't workable.
   * @param {Object} defaultData - Initial model data to populate
   * @param {String} reactNodeId - DOM element ID of the element for mounting
   *    the view's main React component
   * @param {Service} $injector - Angular dependency injection service
   * @param {Service} $scope - Angular view data binding service
   * @param {Boolean} options.enableTimeFilter - Whether to show the time filter
   * @param {Boolean} options.enableAutoRefresh - Whether to show the auto
   *    refresh control
   */
  constructor({
    title = '',
    pageTitle = '',
    api = '',
    apiUrlFn,
    getPageData: _getPageData = getPageData,
    defaultData,
    reactNodeId = null, // WIP: https://github.com/elastic/x-pack-kibana/issues/5198
    $scope,
    $injector,
    options = {},
    alerts = { shouldFetch: false, options: {} },
    fetchDataImmediately = true,
    telemetryPageViewTitle = '',
  }) {
    const titleService = $injector.get('title');
    const $executor = $injector.get('$executor');
    const $window = $injector.get('$window');
    const config = $injector.get('config');

    titleService($scope.cluster, title);

    $scope.pageTitle = pageTitle;
    this.setPageTitle = (title) => ($scope.pageTitle = title);
    $scope.pageData = this.data = { ...defaultData };
    this._isDataInitialized = false;
    this.reactNodeId = reactNodeId;
    this.telemetryPageViewTitle = telemetryPageViewTitle || title;

    let deferTimer;
    let zoomInLevel = 0;

    const popstateHandler = () => zoomInLevel > 0 && --zoomInLevel;
    const removePopstateHandler = () => $window.removeEventListener('popstate', popstateHandler);
    const addPopstateHandler = () => $window.addEventListener('popstate', popstateHandler);

    this.zoomInfo = {
      zoomOutHandler: () => $window.history.back(),
      showZoomOutBtn: () => zoomInLevel > 0,
    };

    const { enableTimeFilter = true, enableAutoRefresh = true } = options;

    async function fetchAlerts() {
      const globalState = $injector.get('globalState');
      const bounds = Legacy.shims.timefilter.getBounds();
      const min = bounds.min?.valueOf();
      const max = bounds.max?.valueOf();
      const options = alerts.options || {};
      try {
        return await Legacy.shims.http.post(
          `/api/monitoring/v1/alert/${globalState.cluster_uuid}/status`,
          {
            body: JSON.stringify({
              alertTypeIds: options.alertTypeIds,
              filters: options.filters,
              timeRange: {
                min,
                max,
              },
            }),
          }
        );
      } catch (err) {
        Legacy.shims.toastNotifications.addDanger({
          title: 'Error fetching alert status',
          text: err.message,
        });
      }
    }

    this.updateData = () => {
      if (this.updateDataPromise) {
        // Do not sent another request if one is inflight
        // See https://github.com/elastic/kibana/issues/24082
        this.updateDataPromise.cancel();
        this.updateDataPromise = null;
      }
      const _api = apiUrlFn ? apiUrlFn() : api;
      const promises = [_getPageData($injector, _api, this.getPaginationRouteOptions())];
      if (alerts.shouldFetch) {
        promises.push(fetchAlerts());
      }
      if (isSetupModeFeatureEnabled(SetupModeFeature.MetricbeatMigration)) {
        promises.push(updateSetupModeData());
      }
      this.updateDataPromise = new PromiseWithCancel(Promise.allSettled(promises));
      return this.updateDataPromise.promise().then(([pageData, alerts]) => {
        $scope.$apply(() => {
          this._isDataInitialized = true; // render will replace loading screen with the react component
          $scope.pageData = this.data = pageData.value; // update the view's data with the fetch result
          $scope.alerts = this.alerts = alerts && alerts.value ? alerts.value : {};
        });
      });
    };

    $scope.$applyAsync(() => {
      const timefilter = Legacy.shims.timefilter;

      if (enableTimeFilter === false) {
        timefilter.disableTimeRangeSelector();
      } else {
        timefilter.enableTimeRangeSelector();
      }

      if (enableAutoRefresh === false) {
        timefilter.disableAutoRefreshSelector();
      } else {
        timefilter.enableAutoRefreshSelector();
      }

      // needed for chart pages
      this.onBrush = ({ xaxis }) => {
        removePopstateHandler();
        const { to, from } = xaxis;
        const timezone = config.get('dateFormat:tz');
        const offset = getOffsetInMS(timezone);
        timefilter.setTime({
          from: moment(from - offset),
          to: moment(to - offset),
          mode: 'absolute',
        });
        $executor.cancel();
        $executor.run();
        ++zoomInLevel;
        clearTimeout(deferTimer);
        /*
          Needed to defer 'popstate' event, so it does not fire immediately after it's added.
          10ms is to make sure the event is not added with the same code digest
        */
        deferTimer = setTimeout(() => addPopstateHandler(), 10);
      };

      // Render loading state
      this.renderReact(null, true);
      fetchDataImmediately && this.updateData();
    });

    $executor.register({
      execute: () => this.updateData(),
    });
    $executor.start($scope);
    $scope.$on('$destroy', () => {
      clearTimeout(deferTimer);
      removePopstateHandler();
      const targetElement = document.getElementById(this.reactNodeId);
      if (targetElement) {
        // WIP https://github.com/elastic/x-pack-kibana/issues/5198
        unmountComponentAtNode(targetElement);
      }
      $executor.destroy();
    });

    this.setTitle = (title) => titleService($scope.cluster, title);
  }

  renderReact(component, trackPageView = false) {
    const renderElement = document.getElementById(this.reactNodeId);
    if (!renderElement) {
      console.warn(`"#${this.reactNodeId}" element has not been added to the DOM yet`);
      return;
    }
    const I18nContext = Legacy.shims.I18nContext;
    const wrappedComponent = (
      <KibanaContextProvider services={Legacy.shims.kibanaServices}>
        <I18nContext>
          <AlertsContext.Provider value={{ allAlerts: this.alerts }}>
            <HeaderMenuPortal
              setHeaderActionMenu={Legacy.shims.appMountParameters.setHeaderActionMenu}
            >
              <AlertsDropdown />
            </HeaderMenuPortal>
            {!this._isDataInitialized ? (
              <PageLoading pageViewTitle={trackPageView ? this.telemetryPageViewTitle : null} />
            ) : (
              component
            )}
          </AlertsContext.Provider>
        </I18nContext>
      </KibanaContextProvider>
    );
    render(wrappedComponent, renderElement);
  }

  getPaginationRouteOptions() {
    return {};
  }
}
