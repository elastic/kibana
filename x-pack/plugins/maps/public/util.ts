/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EMSClient, FileLayer, TMSService } from '@elastic/ems-client';
import type { KibanaExecutionContext } from 'kibana/public';
import { FONTS_API_PATH } from '../common/constants';
import { getHttp, getTilemap, getEMSSettings, getMapsEmsStart } from './kibana_services';
import { getLicenseId } from './licensed_features';
import { makeExecutionContext } from '../common/execution_context';

export function getKibanaTileMap(): unknown {
  return getTilemap();
}

export async function getEmsFileLayers(): Promise<FileLayer[]> {
  if (!getEMSSettings().isEMSEnabled()) {
    return [];
  }

  return (await getEMSClient()).getFileLayers();
}

export async function getEmsTmsServices(): Promise<TMSService[]> {
  if (!getEMSSettings().isEMSEnabled()) {
    return [];
  }

  return (await getEMSClient()).getTMSServices();
}

let emsClient: EMSClient | null = null;
let latestLicenseId: string | undefined;
async function getEMSClient(): Promise<EMSClient> {
  if (!emsClient) {
    emsClient = await getMapsEmsStart().createEMSClient();
  }
  const licenseId = getLicenseId();
  if (latestLicenseId !== licenseId) {
    latestLicenseId = licenseId;
    emsClient.addQueryParams({ license: licenseId ? licenseId : '' });
  }
  return emsClient;
}

export function getGlyphUrl(): string {
  const emsSettings = getEMSSettings();
  if (!emsSettings!.isEMSEnabled()) {
    return getHttp().basePath.prepend(`/${FONTS_API_PATH}/{fontstack}/{range}`);
  }

  return emsSettings!.getEMSFontLibraryUrl();
}

export function isRetina(): boolean {
  return window.devicePixelRatio === 2;
}

export function makePublicExecutionContext(
  id: string,
  description?: string
): KibanaExecutionContext {
  return makeExecutionContext(id, window.location.pathname, description);
}
