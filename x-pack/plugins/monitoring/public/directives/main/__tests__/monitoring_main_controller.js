/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { noop } from 'lodash';
import expect from '@kbn/expect';
import { MonitoringMainController } from '../';

const getMockLicenseService = (options) => ({ mlIsSupported: () => options.mlIsSupported });
const getMockBreadcrumbsService = () => noop; // breadcrumb service has its own test

describe('Monitoring Main Directive Controller', () => {
  /*
   * Simulates calling the monitoringMain directive the way Cluster Listing
   * does:
   *
   *  <monitoring-main
   *    name="listing"
   *  > ... </monitoring-main>
   */
  it('in Cluster Listing', () => {
    const controller = new MonitoringMainController();
    controller.setup({
      clusterName: 'test-cluster-foo',
      licenseService: getMockLicenseService(),
      breadcrumbsService: getMockBreadcrumbsService(),
      attributes: {
        name: 'listing',
      },
    });

    // derived properties
    expect(controller.inListing).to.be(true);
    expect(controller.inAlerts).to.be(false);
    expect(controller.inOverview).to.be(false);

    // attributes
    expect(controller.name).to.be('listing');
    expect(controller.product).to.be(undefined);
    expect(controller.instance).to.be(undefined);
    expect(controller.resolver).to.be(undefined);
    expect(controller.page).to.be(undefined);
    expect(controller.tabIconClass).to.be(undefined);
    expect(controller.tabIconLabel).to.be(undefined);
  });

  /*
   * Simulates calling the monitoringMain directive the way Cluster Alerts
   * Listing does:
   *
   *  <monitoring-main
   *    name="alerts"
   *  > ... </monitoring-main>
   */
  it('in Cluster Alerts', () => {
    const controller = new MonitoringMainController();
    controller.setup({
      clusterName: 'test-cluster-foo',
      licenseService: getMockLicenseService(),
      breadcrumbsService: getMockBreadcrumbsService(),
      attributes: {
        name: 'alerts',
      },
    });

    // derived properties
    expect(controller.inListing).to.be(false);
    expect(controller.inAlerts).to.be(true);
    expect(controller.inOverview).to.be(false);

    // attributes
    expect(controller.name).to.be('alerts');
    expect(controller.product).to.be(undefined);
    expect(controller.instance).to.be(undefined);
    expect(controller.resolver).to.be(undefined);
    expect(controller.page).to.be(undefined);
    expect(controller.tabIconClass).to.be(undefined);
    expect(controller.tabIconLabel).to.be(undefined);
  });

  /*
   * Simulates calling the monitoringMain directive the way Cluster Overview
   * does:
   *
   *  <monitoring-main
   *    name="overview"
   *  > ... </monitoring-main>
   */
  it('in Cluster Overview', () => {
    const controller = new MonitoringMainController();
    controller.setup({
      clusterName: 'test-cluster-foo',
      licenseService: getMockLicenseService(),
      breadcrumbsService: getMockBreadcrumbsService(),
      attributes: {
        name: 'overview',
      },
    });

    // derived properties
    expect(controller.inListing).to.be(false);
    expect(controller.inAlerts).to.be(false);
    expect(controller.inOverview).to.be(true);

    // attributes
    expect(controller.name).to.be('overview');
    expect(controller.product).to.be(undefined);
    expect(controller.instance).to.be(undefined);
    expect(controller.resolver).to.be(undefined);
    expect(controller.page).to.be(undefined);
    expect(controller.tabIconClass).to.be(undefined);
    expect(controller.tabIconLabel).to.be(undefined);
  });

  /*
   * Simulates calling the monitoringMain directive the way that Elasticsearch
   * Node / Advanced does:
   *
   *  <monitoring-main
   *    product="elasticsearch"
   *    name="nodes"
   *    instance="es-node-name-01"
   *    resolver="es-node-resolver-01"
   *    page="advanced"
   *    tab-icon-class="fa star"
   *    tab-icon-class="Master Node"
   *  > ... </monitoring-main>
   */
  it('in ES Node - Advanced', () => {
    const controller = new MonitoringMainController();
    controller.setup({
      clusterName: 'test-cluster-foo',
      licenseService: getMockLicenseService(),
      breadcrumbsService: getMockBreadcrumbsService(),
      attributes: {
        product: 'elasticsearch',
        name: 'nodes',
        instance: 'es-node-name-01',
        resolver: 'es-node-resolver-01',
        page: 'advanced',
        tabIconClass: 'fa star',
        tabIconLabel: 'Master Node',
      },
    });

    // derived properties
    expect(controller.inListing).to.be(false);
    expect(controller.inAlerts).to.be(false);
    expect(controller.inOverview).to.be(false);

    // attributes
    expect(controller.name).to.be('nodes');
    expect(controller.product).to.be('elasticsearch');
    expect(controller.instance).to.be('es-node-name-01');
    expect(controller.resolver).to.be('es-node-resolver-01');
    expect(controller.page).to.be('advanced');
    expect(controller.tabIconClass).to.be('fa star');
    expect(controller.tabIconLabel).to.be('Master Node');
  });

  /**
   * <monitoring-main product="kibana" name="overview">
   */
  it('in Kibana Overview', () => {
    const controller = new MonitoringMainController();
    controller.setup({
      clusterName: 'test-cluster-foo',
      licenseService: getMockLicenseService(),
      breadcrumbsService: getMockBreadcrumbsService(),
      attributes: {
        product: 'kibana',
        name: 'overview',
      },
    });

    // derived properties
    expect(controller.inListing).to.be(false);
    expect(controller.inAlerts).to.be(false);
    expect(controller.inOverview).to.be(false);

    // attributes
    expect(controller.name).to.be('overview');
    expect(controller.product).to.be('kibana');
    expect(controller.instance).to.be(undefined);
    expect(controller.resolver).to.be(undefined);
    expect(controller.page).to.be(undefined);
    expect(controller.tabIconClass).to.be(undefined);
    expect(controller.tabIconLabel).to.be(undefined);
  });

  /**
   * <monitoring-main product="logstash" name="nodes">
   */
  it('in Logstash Listing', () => {
    const controller = new MonitoringMainController();
    controller.setup({
      clusterName: 'test-cluster-foo',
      licenseService: getMockLicenseService(),
      breadcrumbsService: getMockBreadcrumbsService(),
      attributes: {
        product: 'logstash',
        name: 'listing',
      },
    });

    // derived properties
    expect(controller.inListing).to.be(false);
    expect(controller.inAlerts).to.be(false);
    expect(controller.inOverview).to.be(false);

    // attributes
    expect(controller.name).to.be('listing');
    expect(controller.product).to.be('logstash');
    expect(controller.instance).to.be(undefined);
    expect(controller.resolver).to.be(undefined);
    expect(controller.page).to.be(undefined);
    expect(controller.tabIconClass).to.be(undefined);
    expect(controller.tabIconLabel).to.be(undefined);
  });

  /*
   * Test `controller.isMlSupported` function
   */
  describe('Checking support for ML', () => {
    it('license supports ML', () => {
      const controller = new MonitoringMainController();
      controller.setup({
        clusterName: 'test-cluster-foo',
        licenseService: getMockLicenseService({ mlIsSupported: true }),
        breadcrumbsService: getMockBreadcrumbsService(),
        attributes: {
          name: 'listing',
        },
      });

      expect(controller.isMlSupported()).to.be(true);
    });
    it('license does not support ML', () => {
      getMockLicenseService({ mlIsSupported: false });
      const controller = new MonitoringMainController();
      controller.setup({
        clusterName: 'test-cluster-foo',
        licenseService: getMockLicenseService({ mlIsSupported: false }),
        breadcrumbsService: getMockBreadcrumbsService(),
        attributes: {
          name: 'listing',
        },
      });

      expect(controller.isMlSupported()).to.be(false);
    });
  });
});
