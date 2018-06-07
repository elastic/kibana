/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


const GEO_META_URL = `http://meta.url.tbd/`;

import {
} from '@elastic/eui';


export async function getAvailableLayerForField(field) {
  const $ = window.$;
  try {
    const meta = await $.ajax({
      url: GEO_META_URL
    });
    const indexToFields = zipIndexAndTypesAndFilter(meta, field);
    return indexToFields;
  } catch (e) {
    console.error('nometa', e);
    throw e;
  }

}


export async function getMeta() {
  const $ = window.$;
  return new Promise((resolve, reject) => {
    $.ajax({
      url: GEO_META_URL,
      error: (e) => {
        console.error('nometa', e);
        reject(e);
      },
      success: (meta) => {
        resolve(meta);
      }
    });
  });
}

export function getHumanReadableFieldName(fieldName) {
  try {
    if (fieldName.indexOf('~') >= 0) {
      const [indexName, aggName] = fieldName.split('/');
      const indexTokens = indexName.split('_');
      const aggTokens = aggName.split('~');
      const humanReadableIndexName = indexTokens[1] ? indexTokens[1] : indexName;
      let humanreadable;
      if (aggTokens[2]) {
        humanreadable = aggTokens[1] + ' of ' + aggTokens[2] + ' in ' + humanReadableIndexName;
      } else {
        humanreadable = aggTokens[1] + " of " + humanReadableIndexName;
      }
      return humanreadable;
    } else {
      return fieldName;
    }
  } catch(e) {
    //hacky, but not sure if this will work consistently..
    return fieldName;
  }
}


export function colorizeSvg(svg, color) {
  return svg.replace('<svg ', `<svg fill="${color}"  `);
}

export function getDisplayLayerName(layerId) {

  if (layerId.startsWith('prod-dlstats-log')) {
    return 'downloads/log';
  }

  const tokens = layerId.split('/');
  const index = tokens[0];
  // const type = tokens[1];

  let display;
  const typetokens = index.split('_');
  if (typetokens.length > 2) {
    display = typetokens[1];
  } else {
    display = layerId;
  }

  display = display.replace('-', ' ');

  return display;

}

export function zipIndexAndTypesAndFilter(meta, fieldType) {
  const types = [];
  meta.forEach((index)=> {
    index.types.forEach(type => {
      const id = index.indexName + "/" + type.typeName;
      types.push({
        display: getDisplayLayerName(id),
        id: id,
        index: index.indexName,
        type: type.typeName,
        fields: type.fields.filter(field => field.value === fieldType)
      });
    });
  });
  return types.filter(type=>type.fields.length > 0);
}
