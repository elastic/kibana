/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Feature, registerFeature } from './feature_registry';

const kibanaFeatures: Feature[] = [
  {
    id: 'kibana:discover',
    name: 'Discover',
    type: 'app',
    icon: 'discoverApp',
  },
  {
    id: 'kibana:visualize',
    name: 'Visualize',
    type: 'app',
    icon: 'visualizeApp',
  },
  {
    id: 'kibana:dashboard',
    name: 'Dashboard',
    type: 'app',
    icon: 'dashboardApp',
  },
  {
    id: 'kibana:dev_tools',
    name: 'Dev Tools',
    type: 'app',
    icon: 'devToolsApp',
  },
  {
    id: 'kibana:management',
    name: 'Management',
    type: 'app',
    icon: 'managementApp',
  },
];

const timelionFeatures: Feature[] = [
  {
    id: 'timelion',
    name: 'Timelion',
    type: 'app',
    icon: 'timelionApp',
  },
];

export function registerOssFeatures() {
  kibanaFeatures.forEach(registerFeature);
  timelionFeatures.forEach(registerFeature);
}
