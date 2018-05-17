/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import { uiModules } from 'ui/modules';
import template from './index.html';
import { shortenPipelineHash } from '../../../common/formatting';

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
  }

  // kick things off from the directive link function
  setup(options) {
    this._licenseService = options.licenseService;
    this._breadcrumbsService = options.breadcrumbsService;
    this._kbnUrlService = options.kbnUrlService;

    Object.assign(this, options.attributes);

    // set the section we're navigated in
    if (this.product) {
      this.inElasticsearch = this.product === 'elasticsearch';
      this.inKibana = this.product === 'kibana';
      this.inLogstash = this.product === 'logstash';
      this.inBeats = this.product === 'beats';
    } else {
      this.inOverview = this.name === 'overview';
      this.inAlerts = this.name === 'alerts';
      this.inListing = this.name === 'listing' || this.name === 'no-data';
    }

    if (!this.inListing) {
      // no breadcrumbs in cluster listing page
      this.breadcrumbs = this._breadcrumbsService(options.clusterName, this);
    }

    if (this.pipelineHash) {
      this.pipelineHashShort = shortenPipelineHash(this.pipelineHash);
      this.onChangePipelineHash = () => {
        return this._kbnUrlService.changePath(`/logstash/pipelines/${this.pipelineId}/${this.pipelineHash}`);
      };
    }
  }

  // check whether to "highlight" a tab
  isActiveTab(testPath) {
    return this.name === testPath;
  }

  // check whether to show ML tab
  isMlSupported()  {
    return this._licenseService.mlIsSupported();
  }
}

const uiModule = uiModules.get('plugins/monitoring/directives', []);
uiModule.directive('monitoringMain', (breadcrumbs, license, kbnUrl) => {
  return {
    restrict: 'E',
    transclude: true,
    template,
    controller: MonitoringMainController,
    controllerAs: 'monitoringMain',
    bindToController: true,
    link(scope, _element, attributes, controller) {

      controller.setup({
        licenseService: license,
        breadcrumbsService: breadcrumbs,
        kbnUrlService: kbnUrl,
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
          pipelineVersions: get(scope, 'pageData.versions')
        },
        clusterName: get(scope, 'cluster.cluster_name')
      });

    }
  };
});
