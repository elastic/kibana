/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// The new dashboard file names should be added here
export const existingDashboardFileNames = new Set([
  'classic_apm-apm-nodejs',
  'classic_apm-apm-java',
  'classic_apm-otel_other-nodejs',
  'classic_apm-otel_other-java',
  'classic_apm-otel_other-dotnet',
  'classic_apm-edot-nodejs',
  'classic_apm-edot-java',
  'classic_apm-edot-dotnet',
  'classic_apm-edot-python',
  'otel_native-edot-python',
]);

// The new dashboard files should be mapped here
// + changed with the new ones (following the naming convention)
// + similar mapping for edot needed
//     - example: otel_native-edot-nodejs
export async function loadDashboardFile(filename: string) {
  switch (filename) {
    case 'classic_apm-apm-nodejs': {
      return import(
        /* webpackChunkName: "lazyNodeJsClassicApmDashboard" */
        './nodejs.json'
      );
    }
    case 'classic_apm-otel_other-nodejs': {
      return import(
        /* webpackChunkName: "lazyNodeJsApmOtelDashboard" */
        './opentelemetry_nodejs.json'
      );
    }
    case 'classic_apm-edot-nodejs': {
      return import(
        /* webpackChunkName: "lazyNodeJsOtelNativeDashboard" */
        './opentelemetry_nodejs.json'
      );
    }
    case 'classic_apm-apm-java': {
      return import(
        /* webpackChunkName: "lazyJavaClassicApmDashboard" */
        './java.json'
      );
    }
    case 'classic_apm-otel_other-java': {
      return import(
        /* webpackChunkName: "lazyJavaApmOtelDashboard" */
        './opentelemetry_java.json'
      );
    }
    case 'classic_apm-edot-java': {
      return import(
        /* webpackChunkName: "lazyJavaOtelNativeDashboard" */
        './opentelemetry_java.json'
      );
    }
    case 'classic_apm-edot-dotnet': {
      return import(
        /* webpackChunkName: "lazyDotnetOtelNativeDashboard" */
        './opentelemetry_dotnet.json'
      );
    }
    case 'classic_apm-otel_other-dotnet': {
      return import(
        /* webpackChunkName: "lazyDotnetApmOtelDashboard" */
        './opentelemetry_dotnet.json'
      );
    }
    case 'classic_apm-edot-python': {
      return import(
        /* webpackChunkName: "lazyPythonOtelDashboard" */
        './opentelemetry_python.json'
      );
    }
    case 'otel_native-edot-python': {
      return import(
        /* webpackChunkName: "lazyPythonOtelDashboard" */
        './opentelemetry_python.json'
      );
    }
    default: {
      break;
    }
  }
}
