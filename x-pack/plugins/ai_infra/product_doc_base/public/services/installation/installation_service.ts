/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from '@kbn/core-http-browser';
import {
  INSTALLATION_STATUS_API_PATH,
  INSTALL_ALL_API_PATH,
  UNINSTALL_ALL_API_PATH,
  InstallationStatusResponse,
  PerformInstallResponse,
  UninstallResponse,
} from '../../../common/http_api/installation';

export class InstallationService {
  private readonly http: HttpSetup;

  constructor({ http }: { http: HttpSetup }) {
    this.http = http;
  }

  async getInstallationStatus(): Promise<InstallationStatusResponse> {
    return await this.http.get<InstallationStatusResponse>(INSTALLATION_STATUS_API_PATH);
  }

  async install(): Promise<PerformInstallResponse> {
    const response = await this.http.post<PerformInstallResponse>(INSTALL_ALL_API_PATH);
    if (!response.installed) {
      throw new Error('Installation did not complete successfully');
    }
    return response;
  }

  async uninstall(): Promise<UninstallResponse> {
    return await this.http.post<UninstallResponse>(UNINSTALL_ALL_API_PATH);
  }
}
