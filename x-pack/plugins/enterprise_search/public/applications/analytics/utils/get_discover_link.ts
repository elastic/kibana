/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ApplicationStart } from '@kbn/core-application-browser';
import { DataView } from '@kbn/data-views-plugin/common';

export const getDiscoverLink = (application: ApplicationStart, dataView: DataView | null): string =>
  dataView
    ? application.getUrlForApp('discover', {
        path: `#/?_a=(index:'${dataView.id}')`,
      })
    : '';
