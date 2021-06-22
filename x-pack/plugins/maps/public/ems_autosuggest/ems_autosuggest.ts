/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FileLayer } from '@elastic/ems-client';
import { getEmsFileLayers } from '../util';

export interface SampleValuesConfig {
  emsLayerIds?: string[];
  sampleValues?: Array<string | number>;
  sampleValuesColumnName?: string;
}

export interface EMSTermJoinConfig {
  layerId: string;
  field: string;
}

interface UniqueMatch {
  config: { layerId: string; field: string };
  count: number;
}
interface FileLayerFieldShim {
  id: string;
  values?: string[];
  regex?: string;
  alias?: string[];
}

type SampleValues = Array<string | number>;

let isMetaLoaded = false;
let wellKnownColumnNames: Array<{
  regex: RegExp;
  emsConfig: EMSTermJoinConfig;
  emsField: FileLayerFieldShim;
}>;
let wellKnownIds: Array<{
  emsConfig: EMSTermJoinConfig;
  values: string[];
}>;

async function loadMeta() {
  if (isMetaLoaded) {
    return;
  }

  const fileLayers: FileLayer[] = await getEmsFileLayers();

  wellKnownColumnNames = [];
  wellKnownIds = [];

  fileLayers.forEach((fileLayer: FileLayer) => {
    const emsFields: FileLayerFieldShim[] = fileLayer.getFields();
    emsFields.forEach((emsField: FileLayerFieldShim) => {
      const emsConfig = {
        layerId: fileLayer.getId(),
        field: emsField.id,
      };

      if (emsField.alias && emsField.alias.length) {
        emsField.alias.forEach((alias: string) => {
          wellKnownColumnNames.push({
            regex: new RegExp(alias, 'i'),
            emsConfig,
            emsField,
          });
        });
      }

      if (emsField.values) {
        wellKnownIds.push({
          emsConfig,
          values: emsField.values,
        });
      }
    });
  });

  isMetaLoaded = true;
}

export async function suggestEMSTermJoinConfig(
  sampleValuesConfig: SampleValuesConfig
): Promise<EMSTermJoinConfig | null> {
  await loadMeta();
  const matches: EMSTermJoinConfig[] = [];

  if (sampleValuesConfig.sampleValuesColumnName) {
    matches.push(
      ...suggestByName(sampleValuesConfig.sampleValuesColumnName, sampleValuesConfig.sampleValues)
    );
  }

  if (sampleValuesConfig.sampleValues && sampleValuesConfig.sampleValues.length) {
    // Only looks at id-values in main manifest
    matches.push(...suggestByIdValues(sampleValuesConfig.sampleValues));

    // Looks at _all_ columns for EMS-layers.
    if (sampleValuesConfig.emsLayerIds && sampleValuesConfig.emsLayerIds.length) {
      matches.push(
        ...(await suggestsByAllEMSColumns(
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

function suggestByName(columnName: string, sampleValues?: SampleValues): EMSTermJoinConfig[] {
  const matches = wellKnownColumnNames.filter((wellknown) => {
    const nameMatchesAlias = columnName.match(wellknown.regex);
    // Check if this violates any known id-values.
    return sampleValues
      ? nameMatchesAlias && !violatesIdValues(sampleValues, wellknown.emsConfig)
      : nameMatchesAlias;
  });

  return matches.map((m) => {
    return m.emsConfig;
  });
}

function allSamplesMatch(sampleValues: SampleValues, values: string[]) {
  for (let j = 0; j < sampleValues.length; j++) {
    const sampleValue = sampleValues[j].toString();
    if (!existInIds(sampleValue, values)) {
      return false;
    }
  }
  return true;
}

function existInIds(sampleValue: string, ids: string[]): boolean {
  for (let i = 0; i < ids.length; i++) {
    if (ids[i] === sampleValue) {
      return true;
    }
  }
  return false;
}

function violatesIdValues(sampleValues: SampleValues, termConfig: EMSTermJoinConfig) {
  for (let i = 0; i < wellKnownIds.length; i++) {
    if (
      wellKnownIds[i].emsConfig.field === termConfig.field &&
      wellKnownIds[i].emsConfig.layerId === termConfig.layerId
    ) {
      return !allSamplesMatch(sampleValues, wellKnownIds[i].values);
    }
  }
  return true; // If sample values are provided, there needs to be at least one check. Otherwise it's a violation.
}

function suggestByIdValues(sampleValues: SampleValues): EMSTermJoinConfig[] {
  const matches: EMSTermJoinConfig[] = [];
  wellKnownIds.forEach((wellKnownId) => {
    if (allSamplesMatch(sampleValues, wellKnownId.values)) {
      matches.push(wellKnownId.emsConfig);
    }
  });
  return matches;
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

function matchesEmsField(emsJson: any, emsFieldId: string, sampleValues: SampleValues) {
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
  sampleValues: SampleValues
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

async function suggestsByAllEMSColumns(
  emsLayerIds: string[],
  values: SampleValues
): Promise<EMSTermJoinConfig[]> {
  const matches = [];
  for (const emsLayerId of emsLayerIds) {
    const layerIdMathes = await getMatchesForEMSLayer(emsLayerId, values);
    matches.push(...layerIdMathes);
  }
  return matches;
}
