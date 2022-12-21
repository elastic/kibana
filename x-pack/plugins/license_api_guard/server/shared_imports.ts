/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type { ILicense, LicenseType, LicenseCheckState } from '@kbn/licensing-plugin/common/types';

export type { LicensingPluginStart } from '@kbn/licensing-plugin/server';

// eslint-disable-next-line @kbn/imports/no_boundary_crossing
export { licensingMock } from '@kbn/licensing-plugin/server/mocks';
