/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// The new dashboard file names should be added here
const dashboardFileNames = [
  'classic_apm-apm-nodejs-default',
  'classic_apm-edot-nodejs-default',
  'classic_apm-otel_other-nodejs-default',
  'otel_native-edot-nodejs-default',
  'otel_native-otel_other-nodejs-default',
  'classic_apm-apm-java-default',
  'classic_apm-otel_other-java-default',
  'classic_apm-otel_other-dotnet-default',
  'classic_apm-edot-java-default',
  'otel_native-edot-java-default',
  'otel_native-otel_other-java-default',
  'classic_apm-edot-dotnet-default',
  'classic_apm-edot-dotnet-v9',
  'otel_native-edot-python-default',
  'otel_native-otel_other-python-default',
  'classic_apm-otel_other-go-default',
  'otel_native-otel_other-go-default',
] as const;

export type DashboardFileName = (typeof dashboardFileNames)[number];

export const existingDashboardFileNames: Set<string> = new Set(dashboardFileNames);

// The new dashboard files should be mapped here
// + changed with the new ones (following the naming convention)
// + similar mapping for edot needed
//     - example: otel_native-edot-nodejs-default
//     - example: otel_native-edot-nodejs-v26 for a versioned dashboard
export async function loadDashboardFile(filename: DashboardFileName) {
  switch (filename) {
    case 'classic_apm-apm-nodejs-default': {
      return import(
        /* webpackChunkName: "lazyNodeJsClassicApmDashboard" */
        './nodejs.json'
      );
    }
    case 'classic_apm-otel_other-nodejs-default': {
      return import(
        /* webpackChunkName: "lazyNodeJsApmOtelDashboard" */
        './opentelemetry_nodejs.json'
      );
    }
    case 'classic_apm-edot-nodejs-default': {
      return import(
        /* webpackChunkName: "lazyNodeJsOtelNativeDashboard" */
        './opentelemetry_nodejs.json'
      );
    }
    case 'otel_native-otel_other-nodejs-default': {
      return import(
        /* webpackChunkName: "lazyNodeJsOtelNativeEdotDashboard" */
        './otel_native-otel_other-nodejs.json'
      );
    }
    case 'otel_native-edot-nodejs-default': {
      return import(
        /* webpackChunkName: "lazyNodeJsOtelNativeEdotDashboard" */
        './otel_native-edot-nodejs.json'
      );
    }
    case 'classic_apm-apm-java-default': {
      return import(
        /* webpackChunkName: "lazyJavaClassicApmDashboard" */
        './java.json'
      );
    }
    case 'classic_apm-otel_other-java-default': {
      return import(
        /* webpackChunkName: "lazyJavaApmOtelDashboard" */
        './opentelemetry_java.json'
      );
    }
    case 'classic_apm-edot-java-default': {
      return import(
        /* webpackChunkName: "lazyJavaOtelNativeDashboard" */
        './opentelemetry_java.json'
      );
    }
    case 'otel_native-otel_other-java-default': {
      return import(
        /* webpackChunkName: "lazyJavaOtelNativeOtherDashboard" */
        './otel_native-otel_other-java.json'
      );
    }
    case 'otel_native-edot-java-default': {
      return import(
        /* webpackChunkName: "lazyJavaOtelNativeEdotDashboard" */
        './otel_native-edot-java.json'
      );
    }
    case 'classic_apm-edot-dotnet-default': {
      return import(
        /* webpackChunkName: "lazyDotnetOtelNativeDashboard" */
        './opentelemetry_dotnet.json'
      );
    }
    case 'classic_apm-edot-dotnet-v9': {
      return import(
        /* webpackChunkName: "lazyDotnetOtelNativeV9Dashboard" */
        './opentelemetry_dotnet_v9.json'
      );
    }
    case 'classic_apm-otel_other-dotnet-default': {
      return import(
        /* webpackChunkName: "lazyDotnetApmOtelDashboard" */
        './opentelemetry_dotnet.json'
      );
    }
    case 'otel_native-otel_other-python-default': {
      return import(
        /* webpackChunkName: "lazyPythonOtelNativeOtherDashboard" */
        './otel_native-otel_other-python.json'
      );
    }
    case 'otel_native-edot-python-default': {
      return import(
        /* webpackChunkName: "lazyPythonOtelNativeEdotDashboard" */
        './otel_native-edot-python.json'
      );
    }
    case 'otel_native-otel_other-go-default':
    case 'classic_apm-otel_other-go-default': {
      return import(
        /* webpackChunkName: "lazyGoOtelNativeDashboard" */
        './otel_native-otel_other-go.json'
      );
    }
    default: {
      break;
    }
  }
}
