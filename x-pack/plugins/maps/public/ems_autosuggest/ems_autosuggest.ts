/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FileLayer } from '@elastic/ems-client';
import { getEmsFileLayers } from '../util';
import { emsWorldLayerId, emsRegionLayerId, emsUsaZipLayerId } from '../../common';

export interface AutoSuggestConfig {
  emsLayerIds?: string[];
  sampleValues?: Array<string | number>;
  fieldName?: string;
}

export interface EMSTermJoinConfig {
  layerId: string;
  field: string;
}

enum MATCH_TYPE {
  FIELD_ALIAS = 'FIELD_ALIAS',
  FIELD_VALUE_PATTERN = 'FIELD_VALUE_PATTERN',
  FIELD_VALUE_EMS_MATCH = 'FIELD_VALUE_EMS_MATCH',
}

interface ConfigMatch {
  config: EMSTermJoinConfig;
  matchType: MATCH_TYPE;
}

interface WellKnown {
  emsConfig: EMSTermJoinConfig;
  regex: RegExp;
}

const WELLKNOWN_FIELD_ALIASES: WellKnown[] = [
  {
    regex: /(country|countries)/i, // anything with country|countries in it (matches sample data)
    emsConfig: {
      layerId: emsWorldLayerId,
      field: 'iso2',
    },
  },
  {
    regex: /(geo\.){0,}country_iso_code$/i, // ECS postfix for country
    emsConfig: {
      layerId: emsWorldLayerId,
      field: 'iso2',
    },
  },
  {
    regex: /(geo\.){0,}region_iso_code$/i, // ECS postfix for region
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

const WELLKNOWN_FIELD_VALUE_PATTERNS: WellKnown[] = [
  {
    regex: /(^\d{5}$)/, // 5-digit zipcode
    emsConfig: {
      layerId: emsUsaZipLayerId,
      field: 'zip',
    },
  },
  {
    regex: /(^[a-zA-Z]{2}$)/, // iso2 2-char code
    emsConfig: {
      layerId: emsWorldLayerId,
      field: 'iso2',
    },
  },
];

interface UniqueMatch {
  config: { layerId: string; field: string };
  matchTypes: MATCH_TYPE[];
}

function isTermJoinEqual(config1: EMSTermJoinConfig, config2: EMSTermJoinConfig): boolean {
  return config1.field === config2.field && config1.layerId === config2.layerId;
}

function findMatchIndex(matches: UniqueMatch[], config: EMSTermJoinConfig): number {
  return matches.findIndex((match: UniqueMatch) => {
    return isTermJoinEqual(match.config, config);
  });
}

function collectMatches(matches: ConfigMatch[]): UniqueMatch[] {
  const collectedMatches: UniqueMatch[] = [];

  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    const index = findMatchIndex(collectedMatches, match.config);
    if (index >= 0) {
      collectedMatches[index].matchTypes.push(match.matchType);
    } else {
      collectedMatches.push({
        config: match.config,
        matchTypes: [match.matchType],
      });
    }
  }

  return collectedMatches;
}

function sortMatch(match1: UniqueMatch, match2: UniqueMatch): number {
  return match2.matchTypes.length - match2.matchTypes.length;
}

function removePatternFailures(
  matches: ConfigMatch[],
  sampleValues: Array<string | number>
): ConfigMatch[] {
  return matches.filter((match: ConfigMatch) => {
    const wellKnownPattern = WELLKNOWN_FIELD_VALUE_PATTERNS.find((pattern) => {
      return isTermJoinEqual(pattern.emsConfig, match.config);
    });
    return wellKnownPattern ? validateWithPattern(sampleValues, wellKnownPattern) : true;
  });
}

export async function suggestEMSTermJoinConfig(
  sampleValuesConfig: AutoSuggestConfig
): Promise<EMSTermJoinConfig | null> {
  let matches: ConfigMatch[] = [];

  // Get the fuzzy ones based on field-name
  if (sampleValuesConfig.fieldName) {
    const fieldNameMatches: EMSTermJoinConfig[] = suggestByName(sampleValuesConfig.fieldName);
    matches.push(...addMatchType(fieldNameMatches, MATCH_TYPE.FIELD_ALIAS));
  }

  // Filter out the ones that fail the regex-pattern (if any)
  if (sampleValuesConfig.sampleValues && sampleValuesConfig.sampleValues.length) {
    matches = removePatternFailures(matches, sampleValuesConfig.sampleValues);
  }

  if (sampleValuesConfig.sampleValues && sampleValuesConfig.sampleValues.length) {
    if (sampleValuesConfig.emsLayerIds && sampleValuesConfig.emsLayerIds.length) {
      const emsMatches = await suggestByEMSLayerIds(
        sampleValuesConfig.emsLayerIds,
        sampleValuesConfig.sampleValues
      );
      matches.push(...addMatchType(emsMatches, MATCH_TYPE.FIELD_VALUE_EMS_MATCH));
    }

    const patternMatches = suggestByFieldPattern(sampleValuesConfig.sampleValues);
    matches.push(...addMatchType(patternMatches, MATCH_TYPE.FIELD_VALUE_PATTERN));
  }

  const uniqueMatches: UniqueMatch[] = collectMatches(matches);
  uniqueMatches.sort(sortMatch);

  return uniqueMatches.length ? uniqueMatches[0].config : null;
}

function suggestByName(columnName: string): EMSTermJoinConfig[] {
  const matches = WELLKNOWN_FIELD_ALIASES.filter((wellknown) => {
    return columnName.match(wellknown.regex);
  });

  return matches.map((m) => {
    return m.emsConfig;
  });
}

function matchesPattern(value: number | string, wellknown: WellKnown): boolean {
  value = value.toString();
  return !!value.match(wellknown.regex);
}

function validateWithPattern(values: Array<string | number>, wellknown: WellKnown) {
  for (let i = 0; i < values.length; i++) {
    const value = values[i].toString();
    // must satisfy all checks, otherwise reject
    if (!matchesPattern(value, wellknown)) {
      return false;
    }
  }
  return true;
}

function suggestByFieldPattern(values: Array<string | number>): EMSTermJoinConfig[] {
  const matches = WELLKNOWN_FIELD_VALUE_PATTERNS.filter((wellknown) => {
    return validateWithPattern(values, wellknown);
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
    // If at least one value breaks, _reject_ the suggestion
    if (!existsInEMS(emsJson, emsFieldId, sampleValue)) {
      return false;
    }
  }
  return true;
}

async function getMatchesForEMSLayer(
  emsLayerId: string,
  sampleValues: Array<string | number>
): Promise<EMSTermJoinConfig[]> {
  const fileLayers: FileLayer[] = await getEmsFileLayers();
  const emsFileLayer: FileLayer | undefined = fileLayers.find((fl: FileLayer) =>
    fl.hasId(emsLayerId)
  );

  if (!emsFileLayer) {
    return [];
  }

  const emsFields = emsFileLayer.getFields();

  try {
    const emsJson = await emsFileLayer.getGeoJson();
    const matches: EMSTermJoinConfig[] = [];
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
): Promise<EMSTermJoinConfig[]> {
  const matches = [];
  for (const emsLayerId of emsLayerIds) {
    const layerIdMathes = await getMatchesForEMSLayer(emsLayerId, values);
    matches.push(...layerIdMathes);
  }
  return matches;
}

function addMatchType(configs: EMSTermJoinConfig[], matchType: MATCH_TYPE): ConfigMatch[] {
  return configs.map((config) => {
    return {
      matchType,
      config,
    };
  });
}
