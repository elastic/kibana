/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { APP_WRAPPER_CLASS } from '@kbn/core/server';
export const DEFAULT_PAGELOAD_SELECTOR = `.${APP_WRAPPER_CLASS}`;

export const CONTEXT_GETNUMBEROFITEMS = 'GetNumberOfItems';
export const CONTEXT_INJECTCSS = 'InjectCss';
export const CONTEXT_WAITFORRENDER = 'WaitForRender';
export const CONTEXT_GETRENDERERRORS = 'GetVisualisationsRenderErrors';
export const CONTEXT_GETTIMERANGE = 'GetTimeRange';
export const CONTEXT_ELEMENTATTRIBUTES = 'ElementPositionAndAttributes';
export const CONTEXT_WAITFORELEMENTSTOBEINDOM = 'WaitForElementsToBeInDOM';
export const CONTEXT_SKIPTELEMETRY = 'SkipTelemetry';
export const CONTEXT_READMETADATA = 'ReadVisualizationsMetadata';
