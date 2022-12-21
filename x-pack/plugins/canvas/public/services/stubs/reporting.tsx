/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { PluginServiceFactory } from '@kbn/presentation-util-plugin/public';

import { CanvasReportingService } from '../reporting';

type CanvasReportingServiceFactory = PluginServiceFactory<CanvasReportingService>;

export const reportingServiceFactory: CanvasReportingServiceFactory = () => ({
  getReportingPanelPDFComponent: () => () => <div>Reporting Panel PDF</div>,
});
