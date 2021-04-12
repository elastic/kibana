/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { EuiSelect, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { get } from 'lodash';
import template from './index.html';
import { Legacy } from '../../legacy_shims';
import { shortenPipelineHash } from '../../../common/formatting';
import {
  getSetupModeState,
  initSetupModeState,
  isSetupModeFeatureEnabled,
} from '../../lib/setup_mode';
import { Subscription } from 'rxjs';
import { getSafeForExternalLink } from '../../lib/get_safe_for_external_link';
import { SetupModeFeature } from '../../../common/enums';
import './index.scss';

const setOptions = (controller) => {
  if (
    !controller.pipelineVersions ||
    !controller.pipelineVersions.length ||
    !controller.pipelineDropdownElement
  ) {
    return;
  }

  render(
    <EuiFlexGroup>
      <EuiFlexItem grow={false}>
        <EuiSelect
          value={controller.pipelineHash}
          options={controller.pipelineVersions.map((option) => {
            return {
              text: i18n.translate(
                'xpack.monitoring.logstashNavigation.pipelineVersionDescription',
                {
                  defaultMessage:
                    'Version active {relativeLastSeen} and first seen {relativeFirstSeen}',
                  values: {
                    relativeLastSeen: option.relativeLastSeen,
                    relativeFirstSeen: option.relativeFirstSeen,
                  },
                }
              ),
              value: option.hash,
            };
          })}
          onChange={controller.onChangePipelineHash}
        />
      </EuiFlexItem>
    </EuiFlexGroup>,
    controller.pipelineDropdownElement
  );
};

/*
 * Manage data and provide helper methods for the "main" directive's template
 */
export class MonitoringMainController {
  // called internally by Angular
  constructor() {
    this.inListing = false;
    this.inAlerts = false;
    this.inOverview = false;
    this.inElasticsearch = false;
    this.inKibana = false;
    this.inLogstash = false;
    this.inBeats = false;
    this.inApm = false;
  }

  addTimerangeObservers = () => {
    const timefilter = Legacy.shims.timefilter;
    this.subscriptions = new Subscription();

    const refreshIntervalUpdated = () => {
      const { value: refreshInterval, pause: isPaused } = timefilter.getRefreshInterval();
      this.datePicker.onRefreshChange({ refreshInterval, isPaused }, true);
    };

    const timeUpdated = () => {
      this.datePicker.onTimeUpdate({ dateRange: timefilter.getTime() }, true);
    };

    this.subscriptions.add(
      timefilter.getRefreshIntervalUpdate$().subscribe(refreshIntervalUpdated)
    );
    this.subscriptions.add(timefilter.getTimeUpdate$().subscribe(timeUpdated));
  };

  dropdownLoadedHandler() {
    this.pipelineDropdownElement = document.querySelector('#dropdown-elm');
    setOptions(this);
  }

  // kick things off from the directive link function
  setup(options) {
    const timefilter = Legacy.shims.timefilter;
    this._licenseService = options.licenseService;
    this._breadcrumbsService = options.breadcrumbsService;
    this._executorService = options.executorService;

    Object.assign(this, options.attributes);

    this.navName = `${this.name}-nav`;

    // set the section we're navigated in
    if (this.product) {
      this.inElasticsearch = this.product === 'elasticsearch';
      this.inKibana = this.product === 'kibana';
      this.inLogstash = this.product === 'logstash';
      this.inBeats = this.product === 'beats';
      this.inApm = this.product === 'apm';
    } else {
      this.inOverview = this.name === 'overview';
      this.inAlerts = this.name === 'alerts';
      this.inListing = this.name === 'listing'; // || this.name === 'no-data';
    }

    if (!this.inListing) {
      // no breadcrumbs in cluster listing page
      this.breadcrumbs = this._breadcrumbsService(options.clusterName, this);
    }

    if (this.pipelineHash) {
      this.pipelineHashShort = shortenPipelineHash(this.pipelineHash);
      this.onChangePipelineHash = () => {
        window.location.hash = getSafeForExternalLink(
          `#/logstash/pipelines/${this.pipelineId}/${this.pipelineHash}`
        );
      };
    }

    this.datePicker = {
      enableTimeFilter: timefilter.isTimeRangeSelectorEnabled(),
      timeRange: timefilter.getTime(),
      refreshInterval: timefilter.getRefreshInterval(),
      onRefreshChange: ({ isPaused, refreshInterval }, skipSet = false) => {
        this.datePicker.refreshInterval = {
          pause: isPaused,
          value: refreshInterval,
        };
        if (!skipSet) {
          timefilter.setRefreshInterval({
            pause: isPaused,
            value: refreshInterval ? refreshInterval : this.datePicker.refreshInterval.value,
          });
        }
      },
      onTimeUpdate: ({ dateRange }, skipSet = false) => {
        this.datePicker.timeRange = {
          ...dateRange,
        };
        if (!skipSet) {
          timefilter.setTime(dateRange);
        }
        this._executorService.cancel();
        this._executorService.run();
      },
    };
  }

  // check whether to "highlight" a tab
  isActiveTab(testPath) {
    return this.name === testPath;
  }

  // check whether to show ML tab
  isMlSupported() {
    return this._licenseService.mlIsSupported();
  }

  isDisabledTab(product) {
    const setupMode = getSetupModeState();
    if (!isSetupModeFeatureEnabled(SetupModeFeature.MetricbeatMigration)) {
      return false;
    }

    if (!setupMode.data) {
      return false;
    }

    const data = setupMode.data[product] || {};
    if (data.totalUniqueInstanceCount === 0) {
      return true;
    }
    if (
      data.totalUniqueInternallyCollectedCount === 0 &&
      data.totalUniqueFullyMigratedCount === 0 &&
      data.totalUniquePartiallyMigratedCount === 0
    ) {
      return true;
    }
    return false;
  }
}

export function monitoringMainProvider(breadcrumbs, license, $injector) {
  const $executor = $injector.get('$executor');
  const $parse = $injector.get('$parse');

  return {
    restrict: 'E',
    transclude: true,
    template,
    controller: MonitoringMainController,
    controllerAs: 'monitoringMain',
    bindToController: true,
    link(scope, _element, attributes, controller) {
      scope.$applyAsync(() => {
        controller.addTimerangeObservers();
        const setupObj = getSetupObj();
        controller.setup(setupObj);
        Object.keys(setupObj.attributes).forEach((key) => {
          attributes.$observe(key, () => controller.setup(getSetupObj()));
        });
        if (attributes.onLoaded) {
          const onLoaded = $parse(attributes.onLoaded)(scope);
          onLoaded();
        }
      });

      initSetupModeState(scope, $injector, () => {
        controller.setup(getSetupObj());
      });
      if (!scope.cluster) {
        const $route = $injector.get('$route');
        const globalState = $injector.get('globalState');
        scope.cluster = ($route.current.locals.clusters || []).find(
          (cluster) => cluster.cluster_uuid === globalState.cluster_uuid
        );
      }

      function getSetupObj() {
        return {
          licenseService: license,
          breadcrumbsService: breadcrumbs,
          executorService: $executor,
          attributes: {
            name: attributes.name,
            product: attributes.product,
            instance: attributes.instance,
            resolver: attributes.resolver,
            page: attributes.page,
            tabIconClass: attributes.tabIconClass,
            tabIconLabel: attributes.tabIconLabel,
            pipelineId: attributes.pipelineId,
            pipelineHash: attributes.pipelineHash,
            pipelineVersions: get(scope, 'pageData.versions'),
            isCcrEnabled: attributes.isCcrEnabled === 'true' || attributes.isCcrEnabled === true,
          },
          clusterName: get(scope, 'cluster.cluster_name'),
        };
      }

      scope.$on('$destroy', () => {
        controller.pipelineDropdownElement &&
          unmountComponentAtNode(controller.pipelineDropdownElement);
        controller.subscriptions && controller.subscriptions.unsubscribe();
      });
      scope.$watch('pageData.versions', (versions) => {
        controller.pipelineVersions = versions;
        setOptions(controller);
      });
    },
  };
}
