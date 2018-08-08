/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { uiModules } from 'ui/modules';
import { ExportTypesRegistry } from '../../common/export_types_registry';

export const exportTypesRegistry = new ExportTypesRegistry();

const context = require.context('../../export_types', true, /public\/index.js/);
context.keys().forEach(key => context(key).register(exportTypesRegistry));

uiModules.get('xpack/reporting')
  .service('reportingExportTypes', function () {
    this.getById = (exportTypeId) => {
      return exportTypesRegistry.getById(exportTypeId);
    };
  });
