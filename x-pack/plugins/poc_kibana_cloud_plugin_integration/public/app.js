/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable import/no-extraneous-dependencies */

import React from 'react';
import { App as PocKibanaCloudPlugin } from '../../../packages/poc_kibana_cloud_plugin';

/**
 * After building the package, create a "poc-kibana-cloud-plugin" folder
 * and copy the "dist" folder generated, along with the package.json file in it
 * Then move this folder inside the node_modules folder.
 */
// import { App as PocKibanaCloudPlugin } from 'poc-kibana-cloud-plugin';

export const App = () => <PocKibanaCloudPlugin />;
