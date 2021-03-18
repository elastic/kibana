/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FileLayer } from '@elastic/ems-client';
import { getEmsFileLayers } from '../util';

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

const wellKnownColumnFormats = [];

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
