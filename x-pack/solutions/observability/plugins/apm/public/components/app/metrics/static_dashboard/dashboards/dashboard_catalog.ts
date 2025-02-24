/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const existingDashboardFileNames = new Set([
  'classic_apm-apm-nodejs',
  'classic_apm-apm-java',
  'classic_apm-otel_other-nodejs',
  'classic_apm-otel_other-java',
  'classic_apm-otel_other-dotnet',
  'otel_native-otel_other-nodejs',
  'otel_native-otel_other-java',
  'otel_native-otel_other-dotnet',
]);

// Remove :
/**
 * The specially formatted comment in the `import` expression causes the corresponding webpack chunk to be named. This aids us in debugging chunk size issues.
 * [request] placeholder is set for dynamic chunk name: https://webpack.js.org/api/module-methods/#webpackchunkname
 * See https://webpack.js.org/api/module-methods/#magic-comments
 */
// export async function loadDashboardFile(filename: string) {
//   return import(
//     /* webpackMode: "lazy" */
//     /* webpackChunkName: "dashboard" */
//     `./${filename}.json` // Throws an error: Error: worker exitted unexpectedly with code 1 [last message: { bundleId: 'apm', type: 'running' }]
//   );
// }

/**
 * The specially formatted comment in the `import` expression causes the corresponding webpack chunk to be named. This aids us in debugging chunk size issues.
 * See https://webpack.js.org/api/module-methods/#magic-comments
 */

// TODO Change the dashboards with the new ones and create edot mapping
// example: otel_native-edot-nodejs
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
    case 'otel_native-otel_other-nodejs': {
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
    case 'otel_native-otel_other-java': {
      return import(
        /* webpackChunkName: "lazyJavaOtelNativeDashboard" */
        './opentelemetry_java.json'
      );
    }
    case 'otel_native-otel_other-dotnet': {
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
    default: {
      break;
    }
  }
}
