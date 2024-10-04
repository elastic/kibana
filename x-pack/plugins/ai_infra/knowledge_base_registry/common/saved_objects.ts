/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type InstallationStatus = 'installed' | 'uninstalled' | 'installing' | 'error';

export interface ProductDocInstallStatus {
  id: string;
  productName: string;
  productVersion: string;
  installationStatus: InstallationStatus;
  lastInstallationDate: Date | undefined;
  lastInstallationFailureReason: string | undefined;
  indexName: string;
}
