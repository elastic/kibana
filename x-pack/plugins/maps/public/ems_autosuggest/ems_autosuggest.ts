/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FileLayer } from '@elastic/ems-client';
import { getEmsFileLayers } from '../util';

export interface SampleValuesConfig {
  sampleValues?: Array<string | number>;
  sampleValuesColumnName?: string;
}

export interface EMSTermJoinConfig {
  layerId: string;
  field: string;
}

interface UniqueMatch {
  config: EMSTermJoinConfig;
  count: number;
}
interface FileLayerFieldShim {
  id: string;
  values?: string[];
  regex?: string;
  alias?: string[];
}

export async function suggestEMSTermJoinConfig(
  sampleValuesConfig: SampleValuesConfig
): Promise<EMSTermJoinConfig | null> {
  const matches: EMSTermJoinConfig[] = [];

  if (sampleValuesConfig.sampleValuesColumnName) {
    const matchesBasedOnColumnName = await suggestByName(
      sampleValuesConfig.sampleValuesColumnName,
      sampleValuesConfig.sampleValues
    );
    matches.push(...matchesBasedOnColumnName);
  }

  if (sampleValuesConfig.sampleValues && sampleValuesConfig.sampleValues.length) {
    // Only looks at id-values in main manifest
    const matchesBasedOnIds = await suggestByIdValues(sampleValuesConfig.sampleValues);
    matches.push(...matchesBasedOnIds);
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

async function suggestByName(
  columnName: string,
  sampleValues?: Array<string | number>
): Promise<EMSTermJoinConfig[]> {
  const fileLayers = await getEmsFileLayers();

  const matches: EMSTermJoinConfig[] = [];
  fileLayers.forEach((fileLayer) => {
    const emsFields: FileLayerFieldShim[] = fileLayer.getFields();
    emsFields.forEach((emsField: FileLayerFieldShim) => {
      if (!emsField.alias || !emsField.alias.length) {
        return;
      }

      const emsConfig = {
        layerId: fileLayer.getId(),
        field: emsField.id,
      };
      emsField.alias.forEach((alias: string) => {
        const regex = new RegExp(alias, 'i');
        const nameMatchesAlias = !!columnName.match(regex);
        // Check if this violates any known id-values.

        let isMatch: boolean;
        if (sampleValues) {
          if (emsField.values && emsField.values.length) {
            isMatch = nameMatchesAlias && allSamplesMatch(sampleValues, emsField.values);
          } else {
            // requires validation against sample-values but EMS provides no meta to do so.
            isMatch = false;
          }
        } else {
          isMatch = nameMatchesAlias;
        }

        if (isMatch) {
          matches.push(emsConfig);
        }
      });
    });
  });

  return matches;
}

function allSamplesMatch(sampleValues: Array<string | number>, ids: string[]) {
  for (let j = 0; j < sampleValues.length; j++) {
    const sampleValue = sampleValues[j].toString();
    if (!ids.includes(sampleValue)) {
      return false;
    }
  }
  return true;
}

async function suggestByIdValues(
  sampleValues: Array<string | number>
): Promise<EMSTermJoinConfig[]> {
  const matches: EMSTermJoinConfig[] = [];
  const fileLayers: FileLayer[] = await getEmsFileLayers();
  fileLayers.forEach((fileLayer) => {
    const emsFields: FileLayerFieldShim[] = fileLayer.getFields();
    emsFields.forEach((emsField: FileLayerFieldShim) => {
      if (!emsField.values || !emsField.values.length) {
        return;
      }
      const emsConfig = {
        layerId: fileLayer.getId(),
        field: emsField.id,
      };
      if (allSamplesMatch(sampleValues, emsField.values)) {
        matches.push(emsConfig);
      }
    });
  });
  return matches;
}
