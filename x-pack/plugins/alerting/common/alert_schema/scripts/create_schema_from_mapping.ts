/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fs from 'fs';
import path from 'path';
import { get, set } from 'lodash';
import { createLineWriter, LineWriter } from './lib/line_writer';
import { alertFieldMap } from '../field_maps/alert_field_map';
import { FieldMap } from '../field_maps/types';

const PLUGIN_DIR = path.resolve(path.join(__dirname, '..'));
const ALERT_SCHEMA_FILE = 'schemas/alert_schema.ts';

const createSchema = (outputFile: string, fieldMap: FieldMap, schemaPrefix: string) => {
  const lineWriters = {
    REQUIRED_FIELDS: createLineWriter(),
    OPTIONAL_FIELDS: createLineWriter(),
  };

  generateSchemaFromFieldMap({ lineWriters, fieldMap });

  const contents = getSchemaFileContents(lineWriters, schemaPrefix);

  writeGeneratedFile(outputFile, `${contents}\n`);
};

interface GenerateSchemaFromFieldMapOpts {
  lineWriters: Record<string, LineWriter>;
  fieldMap: FieldMap;
}
const generateSchemaFromFieldMap = ({ lineWriters, fieldMap }: GenerateSchemaFromFieldMapOpts) => {
  const requiredFieldMap = { properties: {} };
  const optionalFieldMap = { properties: {} };

  const getKeyWithProperties = (key: string) => key.split('.').join('.properties.');

  // Generate required properties
  Object.keys(fieldMap)
    .filter((key: string) => fieldMap[key].required === true)
    .map((key: string) =>
      set(requiredFieldMap.properties, getKeyWithProperties(key), fieldMap[key])
    );
  generateSchemaLines({
    lineWriter: lineWriters.REQUIRED_FIELDS,
    propertyKey: null,
    required: true,
    fieldMap: requiredFieldMap,
  });

  // Generate optional properties
  Object.keys(fieldMap)
    .filter((key: string) => fieldMap[key].required !== true)
    .map((key: string) =>
      set(optionalFieldMap.properties, getKeyWithProperties(key), fieldMap[key])
    );
  generateSchemaLines({
    lineWriter: lineWriters.OPTIONAL_FIELDS,
    propertyKey: null,
    required: false,
    fieldMap: optionalFieldMap,
  });
};

interface FieldMapProperty {
  properties: Record<string, FieldMapProperty>;
}

interface GenerateSchemaLinesOpts {
  lineWriter: LineWriter;
  propertyKey: string | null;
  required: boolean;
  fieldMap: {
    properties: Record<string, FieldMapProperty>;
  };
}

const getSchemaDefinition = (schemaPrefix: string, isArray: boolean): string => {
  if (isArray) {
    schemaPrefix = `${schemaPrefix}Array`;
  }
  return schemaPrefix;
};

const generateSchemaLines = ({
  fieldMap,
  propertyKey,
  lineWriter,
  required,
}: GenerateSchemaLinesOpts) => {
  if (fieldMap == null) return;

  const type = get(fieldMap, 'type');
  const isArray = get(fieldMap, 'array', false);
  const isEnabled = get(fieldMap, 'enabled', true);

  if (null != type) {
    switch (type) {
      case 'flattened':
        lineWriter.addLine(`'${propertyKey}': ${getSchemaDefinition('schemaUnknown', isArray)},`);
        break;
      case 'object':
      case 'nested':
        if (!isEnabled) {
          lineWriter.addLine(`'${propertyKey}': ${getSchemaDefinition('schemaUnknown', isArray)},`);
        } else if (isArray && null != fieldMap.properties) {
          lineWriter.addLineAndIndent(`'${propertyKey}': rt.array(`);
          if (required) {
            lineWriter.addLineAndIndent(`rt.type({`);
          } else {
            lineWriter.addLineAndIndent(`rt.partial({`);
          }
          for (const prop of Object.keys(fieldMap.properties).sort()) {
            generateSchemaLines({
              lineWriter,
              propertyKey: prop,
              required,
              fieldMap: fieldMap.properties[prop],
            });
          }
          lineWriter.dedentAndAddLine(`})`);
          lineWriter.dedentAndAddLine(`),`);
        }
        break;
      case 'keyword':
      case 'ip':
      case 'constant_keyword':
      case 'match_only_text':
      case 'version':
      case 'wildcard':
        lineWriter.addLine(`'${propertyKey}': ${getSchemaDefinition('schemaString', isArray)},`);
        break;
      case 'date':
        lineWriter.addLine(`'${propertyKey}': ${getSchemaDefinition('schemaDate', isArray)},`);
        break;
      case 'date_range':
        lineWriter.addLine(`'${propertyKey}': ${getSchemaDefinition('schemaDateRange', isArray)},`);
        break;
      case 'geo_point':
        lineWriter.addLine(`'${propertyKey}': ${getSchemaDefinition('schemaGeoPoint', isArray)},`);
        break;
      case 'long':
      case 'scaled_float':
        lineWriter.addLine(
          `'${propertyKey}': ${getSchemaDefinition('schemaStringOrNumber', isArray)},`
        );
        break;
      case 'float':
      case 'integer':
        lineWriter.addLine(`'${propertyKey}': ${getSchemaDefinition('schemaNumber', isArray)},`);
        break;
      case 'boolean':
        lineWriter.addLine(`'${propertyKey}': ${getSchemaDefinition('schemaBoolean', isArray)},`);
        break;
      default:
        logError(`unknown type ${type}: ${JSON.stringify(fieldMap)}`);
        break;
    }

    return;
  }

  if (null == get(fieldMap, 'properties')) {
    logError(`unknown properties ${propertyKey}: ${JSON.stringify(fieldMap)}`);
  }

  if (null == propertyKey) {
    if (required) {
      lineWriter.addLineAndIndent(`rt.type({`);
    } else {
      lineWriter.addLineAndIndent(`rt.partial({`);
    }
  }

  // write the object properties
  for (const prop of Object.keys(fieldMap.properties).sort()) {
    const key = propertyKey ? `${propertyKey}.${prop}` : prop;
    generateSchemaLines({
      lineWriter,
      propertyKey: key,
      required,
      fieldMap: fieldMap.properties[prop],
    });
  }

  if (null == propertyKey) {
    lineWriter.dedentAndAddLine(`}),`);
  }
};

const SchemaFileTemplate = `
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// ---------------------------------- WARNING ----------------------------------
// this file was generated, and should not be edited by hand
// ---------------------------------- WARNING ----------------------------------

import { Either } from 'fp-ts/lib/Either';
import * as rt from 'io-ts';

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

export const IsoDateString = new rt.Type<string, string, unknown>(
  'IsoDateString',
  rt.string.is,
  (input, context): Either<rt.Errors, string> => {
    if (typeof input === 'string' && ISO_DATE_PATTERN.test(input)) {
      return rt.success(input);
    } else {
      return rt.failure(input, context);
    }
  },
  rt.identity
);

export type IsoDateStringC = typeof IsoDateString;

export const schemaDate = IsoDateString;
export const schemaDateArray = rt.array(IsoDateString);
export const schemaDateRange = rt.partial({
  gte: schemaDate,
  lte: schemaDate,
});
export const schemaDateRangeArray = rt.array(schemaDateRange);
export const schemaUnknown = rt.unknown;
export const schemaUnknownArray = rt.array(rt.unknown);
export const schemaString = rt.string;
export const schemaStringArray = rt.array(schemaString);
export const schemaNumber = rt.number;
export const schemaNumberArray = rt.array(schemaNumber);
export const schemaStringOrNumber = rt.union([schemaString, schemaNumber]);
export const schemaStringOrNumberArray = rt.array(schemaStringOrNumber);
export const schemaBoolean = rt.boolean;
export const schemaBooleanArray = rt.array(schemaBoolean);
const schemaGeoPointCoords = rt.type({
  type: schemaString,
  coordinates: schemaNumberArray,
});
const schemaGeoPointString = schemaString;
const schemaGeoPointLatLon = rt.type({
  lat: schemaNumber,
  lon: schemaNumber,
});
const schemaGeoPointLocation = rt.type({
  location: schemaNumberArray,
});
const schemaGeoPointLocationString = rt.type({
  location: schemaString,
});
export const schemaGeoPoint = rt.union([
  schemaGeoPointCoords,
  schemaGeoPointString,
  schemaGeoPointLatLon,
  schemaGeoPointLocation,
  schemaGeoPointLocationString,
]);
export const schemaGeoPointArray = rt.array(schemaGeoPoint);

const %%schemaPrefix%%RequiredSchema = %%REQUIRED_FIELDS%%;
const %%schemaPrefix%%OptionalSchema = %%OPTIONAL_FIELDS%%;

export const %%schemaPrefix%%Schema = rt.intersection([%%schemaPrefix%%RequiredSchema, %%schemaPrefix%%OptionalSchema]);

export type %%schemaPrefix%% = rt.TypeOf<typeof %%schemaPrefix%%Schema>;
`.trim();

const getSchemaFileContents = (lineWriters: Record<string, LineWriter>, schemaPrefix: string) => {
  return Object.keys(lineWriters).reduce((currTemplate, key) => {
    const schemaLines = lineWriters[key].getContent().replace(/,$/, '');
    return currTemplate
      .replaceAll(`%%schemaPrefix%%`, schemaPrefix)
      .replace(`%%${key}%%`, schemaLines);
  }, SchemaFileTemplate);
};

const writeGeneratedFile = (fileName: string, contents: string) => {
  const genFileName = path.join(PLUGIN_DIR, fileName);
  try {
    fs.writeFileSync(genFileName, contents);
  } catch (err) {
    logError(`error writing file: ${genFileName}: ${err.message}`);
  }
};

const logError = (message: string) => {
  // eslint-disable-next-line no-console
  console.log(`error: ${message}`);
  process.exit(1);
};

try {
  // eslint-disable-next-line no-console
  console.log(`Creating runtime schema for AlertFieldMap`);
  createSchema(ALERT_SCHEMA_FILE, alertFieldMap, 'Alert');

  // eslint-disable-next-line no-console
  console.log(`Finished creating schemas!`);
} catch (error) {
  logError(`Error encountered creating schemas ${error.message}`);
}
