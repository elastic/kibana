/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export enum AppFeatureSecurityKey {
  // Sample code to demonstrate how to configure app features.
  exampleAppFeature = 'example_app_feature',
}

export enum AppFeatureCasesKey {
  // Sample code to demonstrate how to configure cases features.
  exampleCasesFeature = 'example_cases_feature',
}

// Merges the two enums.
// We need to merge the value and the type and export both to replicate how enum works.
export const AppFeatureKey = { ...AppFeatureSecurityKey, ...AppFeatureCasesKey };
export type AppFeatureKey = AppFeatureSecurityKey | AppFeatureCasesKey;

type AppFeatureSecurityKeys = { [key in AppFeatureSecurityKey]: boolean };
type AppFeatureCasesKeys = { [key in AppFeatureCasesKey]: boolean };
export type AppFeatureKeys = AppFeatureSecurityKeys & AppFeatureCasesKeys;
