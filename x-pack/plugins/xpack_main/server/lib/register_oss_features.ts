/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Feature, registerFeature } from './feature_registry';

const kibanaFeatures: Feature[] = [
  {
    id: 'discover',
    name: 'Discover',
    icon: 'discoverApp',
    navLinkId: 'kibana:discover',
    catalogue: ['discover'],
  },
  {
    id: 'visualize',
    name: 'Visualize',
    icon: 'visualizeApp',
    navLinkId: 'kibana:visualize',
    catalogue: ['visualize'],
  },
  {
    id: 'dashboard',
    name: 'Dashboard',
    icon: 'dashboardApp',
    navLinkId: 'kibana:dashboard',
    catalogue: ['dashboard'],
  },
  {
    id: 'dev_tools',
    name: 'Dev Tools',
    icon: 'devToolsApp',
    navLinkId: 'kibana:dev_tools',
    catalogue: ['console', 'searchprofiler', 'grokdebugger'],
  },
  {
    id: 'advancedSettings',
    name: 'Advanced Settings',
    icon: 'advancedSettingsApp',
    catalogue: ['advanced_settings'],
    management: {
      kibana: ['settings'],
    },
  },
  {
    id: 'indexPatterns',
    name: 'Index Pattern Management',
    icon: 'indexPatternApp',
    catalogue: ['index_patterns'],
    management: {
      kibana: ['indices'],
    },
  },
];

const timelionFeatures: Feature[] = [
  {
    id: 'timelion',
    name: 'Timelion',
    icon: 'timelionApp',
    navLinkId: 'timelion',
    catalogue: ['timelion'],
  },
];

export function registerOssFeatures() {
  kibanaFeatures.forEach(registerFeature);
  timelionFeatures.forEach(registerFeature);
}
