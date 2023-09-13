/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fetch from 'node-fetch';
import { FONTS_API_PATH } from '../../../common/constants';
import { getDocLinks, getHttp, getEMSSettings } from '../../kibana_services';

let canAccessEmsFonts: boolean | undefined;
let canAccessEmsFontsPromise: Promise<boolean> | null = null;
export async function getCanAccessEmsFonts(): Promise<boolean> {
  if (!canAccessEmsFontsPromise) {
    canAccessEmsFontsPromise = new Promise(async (resolve) => {
      try {
        canAccessEmsFonts = undefined;

        const emsSettings = getEMSSettings();
        if (!emsSettings || !emsSettings.isEMSEnabled()) {
          resolve(false);
        }
        const emsFontUrlTemplate = emsSettings.getEMSFontLibraryUrl();

        const emsFontUrl = emsFontUrlTemplate
          .replace('{fontstack}', 'Open Sans')
          .replace('{range}', '0-255');
        const resp = await fetch(emsFontUrl, {
          method: 'HEAD',
        });
        if (resp.status >= 400) {
          throw new Error(`status: ${resp.status}`);
        }
        canAccessEmsFonts = true;
        resolve(true);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.warn(
          `Unable to access fonts from Elastic Maps Service (EMS). To avoid unnecessary EMS requests, set 'map.includeElasticMapsService: false' in 'kibana.yml'. For more details please visit: ${
            getDocLinks().links.maps.connectToEms
          }`
        );
        canAccessEmsFonts = false;
        resolve(false);
      }
    });
  }
  return canAccessEmsFontsPromise;
}

// test only function to reset singleton for different test cases.
export function testOnlyClearCanAccessEmsFontsPromise() {
  canAccessEmsFontsPromise = null;
  canAccessEmsFonts = undefined;
}

export function getKibanaFontsGlyphUrl(): string {
  return getHttp().basePath.prepend(`${FONTS_API_PATH}/{fontstack}/{range}`);
}

export function getGlyphs(): { glyphUrlTemplate: string; isEmsFont: boolean } {
  const emsSettings = getEMSSettings();
  if (
    !emsSettings ||
    !emsSettings.isEMSEnabled() ||
    (typeof canAccessEmsFonts === 'boolean' && !canAccessEmsFonts)
  ) {
    return {
      glyphUrlTemplate: getKibanaFontsGlyphUrl(),
      isEmsFont: false,
    };
  }

  return {
    glyphUrlTemplate: emsSettings.getEMSFontLibraryUrl(),
    isEmsFont: true,
  };
}
