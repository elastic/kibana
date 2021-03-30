/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FileLayer } from '@elastic/ems-client';
import { getEmsFileLayers, fetchGeoJson } from '../util';

export interface ISampleValuesConfig {
  emsLayerIds?: string[];
  sampleValues?: Array<string | number>;
  sampleValuesColumnName?: string;
}

export interface IEMSTermJoinConfig {
  layerId: string;
  field: string;
}

const emsWorldLayerId = 'world_countries';
const emsRegionLayerId = 'administrative_regions_lvl2';

const wellKnownColumnNames = [
  {
    regex: /(geo\.){0,}country_iso_code$/i, // ECS postfix for country
    emsConfig: {
      layerId: emsWorldLayerId,
      field: 'iso2',
    },
  },
  {
    regex: /(geo\.){0,}region_iso_code$/i, // ECS postfixn for region
    emsConfig: {
      layerId: emsRegionLayerId,
      field: 'region_iso_code',
    },
  },
  {
    regex: /^country/i, // anything starting with country
    emsConfig: {
      layerId: emsWorldLayerId,
      field: 'name',
    },
  },
];

const wellKnownColumnFormats = [
  {
    regex: /(^\d{5}$)/i, // 5-digit zipcode
    emsConfig: {
      layerId: 'usa_zip_codes',
      field: 'zip',
    },
  },
];

interface UniqueMatch {
  config: { layerId: string; field: string };
  count: number;
}

export async function suggestEMSTermJoinConfig(
  sampleValuesConfig: ISampleValuesConfig
): Promise<IEMSTermJoinConfig | null> {
  const matches: Array<{ layerId: string; field: string }> = [];

  if (sampleValuesConfig.sampleValuesColumnName) {
    matches.push(...suggestByName(sampleValuesConfig.sampleValuesColumnName));
  }

  if (sampleValuesConfig.sampleValues && sampleValuesConfig.sampleValues.length) {
    matches.push(...suggestByValues(sampleValuesConfig.sampleValues));

    if (sampleValuesConfig.emsLayerIds && sampleValuesConfig.emsLayerIds.length) {
      matches.push(
        ...(await suggestByEMSLayerIds(
          sampleValuesConfig.emsLayerIds,
          sampleValuesConfig.sampleValues
        ))
      );
    }
  }

  const uniqMatches: UniqueMatch[] = matches.reduce((accum: UniqueMatch[], match) => {
    const found = accum.find((m) => {
      return m.config.layerId === match.layerId && m.config.field === match.layerId;
    });

    if (found) {
      found.count += 1;
    } else {
      accum.push({
        config: match,
        count: 1,
      });
    }

    return accum;
  }, []);

  uniqMatches.sort((a, b) => {
    return b.count - a.count;
  });

  return uniqMatches.length ? uniqMatches[0].config : null;
}

function suggestByName(columnName: string): IEMSTermJoinConfig[] {
  const matches = wellKnownColumnNames.filter((wellknown) => {
    return columnName.match(wellknown.regex);
  });

  return matches.map((m) => {
    return m.emsConfig;
  });
}

function suggestByValues(values: Array<string | number>): IEMSTermJoinConfig[] {
  const matches = wellKnownColumnFormats.filter((wellknown) => {
    for (let i = 0; i < values.length; i++) {
      const value = values[i].toString();
      if (!value.match(wellknown.regex)) {
        return false;
      }
    }
    return true;
  });

  return matches.map((m) => {
    return m.emsConfig;
  });
}

function existsInEMS(emsJson: any, emsFieldId: string, sampleValue: string): boolean {
  for (let i = 0; i < emsJson.features.length; i++) {
    const emsFieldValue = emsJson.features[i].properties[emsFieldId].toString();
    if (emsFieldValue.toString() === sampleValue) {
      return true;
    }
  }
  return false;
}

function matchesEmsField(emsJson: any, emsFieldId: string, sampleValues: Array<string | number>) {
  for (let j = 0; j < sampleValues.length; j++) {
    const sampleValue = sampleValues[j].toString();
    if (!existsInEMS(emsJson, emsFieldId, sampleValue)) {
      return false;
    }
  }
  return true;
}

async function getMatchesForEMSLayer(
  emsLayerId: string,
  sampleValues: Array<string | number>
): Promise<IEMSTermJoinConfig[]> {
  const fileLayers: FileLayer[] = await getEmsFileLayers();
  const emsFileLayer: FileLayer | undefined = fileLayers.find((fl) => fl.hasId(emsLayerId));

  if (!emsFileLayer) {
    return [];
  }

  const emsFields = emsFileLayer.getFields();
  const url = emsFileLayer.getDefaultFormatUrl();

  try {
    const emsJson = await fetchGeoJson(url, emsFileLayer.getDefaultFormatType(), 'data');
    const matches: IEMSTermJoinConfig[] = [];
    for (let f = 0; f < emsFields.length; f++) {
      if (matchesEmsField(emsJson, emsFields[f].id, sampleValues)) {
        matches.push({
          layerId: emsLayerId,
          field: emsFields[f].id,
        });
      }
    }
    return matches;
  } catch (e) {
    return [];
  }
}

async function suggestByEMSLayerIds(
  emsLayerIds: string[],
  values: Array<string | number>
): Promise<IEMSTermJoinConfig[]> {
  const matches = [];
  for (const emsLayerId of emsLayerIds) {
    const layerIdMathes = await getMatchesForEMSLayer(emsLayerId, values);
    matches.push(...layerIdMathes);
  }
  return matches;
}
