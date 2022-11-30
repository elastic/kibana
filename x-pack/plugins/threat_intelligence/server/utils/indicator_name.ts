/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import dedent from 'dedent';
import { RawIndicatorFieldId } from '../../common/types/indicator';

/**
 * Mapping connects one or more types to field values that should be used to generate threat.indicator.name field.
 */
type Mapping = [types: string[], paths: RawIndicatorFieldId[]];

type Mappings = Mapping[];

const mappingsArray: Mappings = [
  [['ipv4-addr', 'ipv6-addr'], [RawIndicatorFieldId.Ip]],
  // For example, `file` indicator will have `threat.indicator.name` computed out of the first
  // hash value field defined below, in order of occurrence
  [
    ['file'],
    [
      RawIndicatorFieldId.FileSha256,
      RawIndicatorFieldId.FileMd5,
      RawIndicatorFieldId.FileSha1,
      RawIndicatorFieldId.FileSha224,
      RawIndicatorFieldId.FileSha3224,
      RawIndicatorFieldId.FileSha3256,
      RawIndicatorFieldId.FileSha384,
      RawIndicatorFieldId.FileSha3384,
      RawIndicatorFieldId.FileSha512,
      RawIndicatorFieldId.FileSha3512,
      RawIndicatorFieldId.FileSha512224,
      RawIndicatorFieldId.FileSha512256,
      RawIndicatorFieldId.FileSSDeep,
      RawIndicatorFieldId.FileTlsh,
      RawIndicatorFieldId.FileImpfuzzy,
      RawIndicatorFieldId.FileImphash,
      RawIndicatorFieldId.FilePehash,
      RawIndicatorFieldId.FileVhash,
    ],
  ],
  [['url'], [RawIndicatorFieldId.UrlFull]],
  [['domain', 'domain-name'], [RawIndicatorFieldId.UrlDomain]],
  [['x509-certificate', 'x509 serial'], [RawIndicatorFieldId.X509Serial]],
  [['email-addr'], [RawIndicatorFieldId.EmailAddress]],
  [['unknown', 'email', 'email-message'], [RawIndicatorFieldId.Id]],
  [['windows-registry-key'], [RawIndicatorFieldId.WindowsRegistryKey]],
  [['autonomous-system'], [RawIndicatorFieldId.AutonomousSystemNumber]],
  [['mac-addr'], [RawIndicatorFieldId.MacAddress]],
];

/**
 * Generates Painless condition checking if given `type` is matched
 */
const fieldTypeCheck = (type: string) =>
  `if (doc.containsKey('threat.indicator.type') && !doc['threat.indicator.type'].empty && doc['threat.indicator.type'].size()!=0 && doc['threat.indicator.type'].value!=null && doc['threat.indicator.type'].value.toLowerCase()=='${type.toLowerCase()}')`;

/**
 * Generates Painless condition checking if given `field` has value
 */
const fieldValueCheck = (field: string) =>
  `if (doc.containsKey('${field}') && !doc['${field}'].empty && doc['${field}'].size()!=0 && doc['${field}'].value!=null)`;

/**
 * Converts Mapping to Painless script, computing `threat.indicator.name` value for given indicator types.
 */
const mappingToIndicatorNameScript = ([types, paths]: Mapping) => {
  return dedent`${types
    .map(
      (t) =>
        `${fieldTypeCheck(t)} { ${paths
          .map((p) => `${fieldValueCheck(p)} { return emit(doc['${p}'].value) }`)
          .join('\n')} }`
    )
    .join('\n')}`;
};

/**
 * Converts Mapping to Painless script, computing `threat.indicator.name_origin` used to determine which document field has
 * been used to obtain `threat.indicator.name`.
 */
const mappingToIndicatorNameOriginScript = ([types, paths]: Mapping) => {
  return dedent`${types
    .map(
      (t) =>
        `${fieldTypeCheck(t)} { ${paths
          .map((p) => `${fieldValueCheck(p)} { return emit('${p}') }`)
          .join('\n')} }`
    )
    .join('\n')}`;
};

/**
 * Generates the runtime field script computing display name for the given indicator
 */
export const threatIndicatorNamesScript = (mappings: Mappings = mappingsArray) => {
  const combined = mappings.map(mappingToIndicatorNameScript).join('\n\n');

  return `${combined}\n\nreturn emit('')`;
};

/**
 * Generates the runtime field script computing the display name origin path for given indicator
 */
export const threatIndicatorNamesOriginScript = (mappings: Mappings = mappingsArray) => {
  const combined = mappings.map(mappingToIndicatorNameOriginScript).join('\n\n');

  return `${combined}\n\nreturn emit('')`;
};
