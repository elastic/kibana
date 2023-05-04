/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Enum of indicator fields supported by the Threat Intelligence plugin.
 */
export enum RawIndicatorFieldId {
  Type = 'threat.indicator.type',
  Confidence = 'threat.indicator.confidence',
  FirstSeen = 'threat.indicator.first_seen',
  LastSeen = 'threat.indicator.last_seen',
  MarkingTLP = 'threat.indicator.marking.tlp',
  Feed = 'threat.feed.name',
  Ip = 'threat.indicator.ip',
  EmailAddress = 'threat.indicator.email.address',
  UrlFull = 'threat.indicator.url.full',
  UrlOriginal = 'threat.indicator.url.original',
  UrlDomain = 'threat.indicator.url.domain',
  FileSha256 = 'threat.indicator.file.hash.sha256',
  FileMd5 = 'threat.indicator.file.hash.md5',
  FileSha1 = 'threat.indicator.file.hash.sha1',
  FileSha224 = 'threat.indicator.file.hash.sha224',
  FileSha3224 = 'threat.indicator.file.hash.sha3-224',
  FileSha3256 = 'threat.indicator.file.hash.sha3-256',
  FileSha384 = 'threat.indicator.file.hash.sha384',
  FileSha3384 = 'threat.indicator.file.hash.sha3-384',
  FileSha512 = 'threat.indicator.file.hash.sha512',
  FileSha3512 = 'threat.indicator.file.hash.sha3-512',
  FileSha512224 = 'threat.indicator.file.hash.sha512/224',
  FileSha512256 = 'threat.indicator.file.hash.sha512/256',
  FileSSDeep = 'threat.indicator.file.hash.ssdeep',
  FileTlsh = 'threat.indicator.file.hash.tlsh',
  FileImpfuzzy = 'threat.indicator.file.hash.impfuzzy',
  FileImphash = 'threat.indicator.file.hash.imphash',
  FilePehash = 'threat.indicator.file.hash.pehash',
  FileVhash = 'threat.indicator.file.hash.vhash',
  X509Serial = 'threat.indicator.x509.serial_number',
  WindowsRegistryKey = 'threat.indicator.registry.key',
  WindowsRegistryPath = 'threat.indicator.registry.path',
  AutonomousSystemNumber = 'threat.indicator.as.number',
  MacAddress = 'threat.indicator.mac',
  TimeStamp = '@timestamp',
  Id = '_id',
  Name = 'threat.indicator.name',
  Description = 'threat.indicator.description',
  NameOrigin = 'threat.indicator.name_origin',
}

/**
 * Threat indicator field map to Enriched Event.
 * (reverse of https://github.com/elastic/kibana/blob/main/x-pack/plugins/security_solution/common/cti/constants.ts#L35)
 */
export const IndicatorFieldEventEnrichmentMap: { [id: string]: string[] } = {
  [RawIndicatorFieldId.FileSha256]: ['file.hash.sha256'],
  [RawIndicatorFieldId.FileMd5]: ['file.hash.md5'],
  [RawIndicatorFieldId.FileSha1]: ['file.hash.sha1'],
  [RawIndicatorFieldId.FileSha224]: ['file.hash.sha224'],
  [RawIndicatorFieldId.FileSha3224]: ['file.hash.sha3-224'],
  [RawIndicatorFieldId.FileSha3256]: ['file.hash.sha3-256'],
  [RawIndicatorFieldId.FileSha384]: ['file.hash.sha384'],
  [RawIndicatorFieldId.FileSha3384]: ['file.hash.sha3-384'],
  [RawIndicatorFieldId.FileSha512]: ['file.hash.sha512'],
  [RawIndicatorFieldId.FileSha3512]: ['file.hash.sha3-512'],
  [RawIndicatorFieldId.FileSha512224]: ['file.hash.sha512/224'],
  [RawIndicatorFieldId.FileSha512256]: ['file.hash.sha512/256'],
  [RawIndicatorFieldId.FileSSDeep]: ['file.hash.ssdeep'],
  [RawIndicatorFieldId.FileTlsh]: ['file.hash.tlsh'],
  [RawIndicatorFieldId.FileImpfuzzy]: ['file.hash.impfuzzy'],
  [RawIndicatorFieldId.FileImphash]: ['file.hash.imphash'],
  [RawIndicatorFieldId.FilePehash]: ['file.hash.pehash'],
  [RawIndicatorFieldId.FileVhash]: ['file.hash.vhash'],
  [RawIndicatorFieldId.Ip]: ['source.ip', 'destination.ip'],
  [RawIndicatorFieldId.UrlFull]: ['url.full'],
  [RawIndicatorFieldId.WindowsRegistryPath]: ['registry.path'],
};

/**
 * Threat Intelligence Indicator interface.
 */
export interface Indicator {
  _id?: unknown;
  fields: Partial<Record<RawIndicatorFieldId, unknown[]>>;
}

/**
 * Used as a base to create Indicators of a specific type. Mocks are used in Jest tests and storybooks
 */
const generateMockBaseIndicator = (): Indicator => ({
  fields: {
    '@timestamp': ['2022-01-01T01:01:01.000Z'],
    'threat.indicator.first_seen': ['2022-01-01T01:01:01.000Z'],
    'threat.feed.name': ['[Filebeat] AbuseCH Malware'],
  },
  _id: Math.random(),
});

/**
 * Used to create an Indicator where the type is not important.
 */
export const generateMockIndicator = (): Indicator => {
  const indicator = generateMockBaseIndicator();

  indicator.fields['threat.indicator.type'] = ['type'];
  indicator.fields['threat.indicator.ip'] = ['0.0.0.0'];
  indicator.fields['threat.indicator.name'] = ['0.0.0.0'];

  return indicator;
};

/**
 * Used to create an Indicator with tlp marking
 */
export const generateMockIndicatorWithTlp = (): Indicator => {
  const indicator = generateMockBaseIndicator();

  indicator.fields['threat.indicator.type'] = ['type'];
  indicator.fields['threat.indicator.ip'] = ['0.0.0.0'];
  indicator.fields['threat.indicator.name'] = ['0.0.0.0'];
  indicator.fields['threat.indicator.marking.tlp'] = ['RED'];

  return indicator;
};

/**
 * Used to create a Url Indicator.
 */
export const generateMockUrlIndicator = (): Indicator => {
  const indicator = generateMockBaseIndicator();

  indicator.fields['threat.indicator.type'] = ['url'];
  indicator.fields['threat.indicator.ip'] = ['0.0.0.0'];
  indicator.fields['threat.indicator.url.full'] = ['https://0.0.0.0/test'];
  indicator.fields['threat.indicator.url.original'] = ['https://0.0.0.0/test'];
  indicator.fields['threat.indicator.name'] = ['https://0.0.0.0/test'];
  indicator.fields['threat.indicator.name_origin'] = ['threat.indicator.url.full'];

  return indicator;
};

/**
 * Used to create a File Indicator.
 */
export const generateMockFileIndicator = (): Indicator => {
  const indicator = generateMockBaseIndicator();

  indicator.fields['threat.indicator.type'] = ['file'];
  indicator.fields['threat.indicator.file.hash.sha256'] = ['sample_sha256_hash'];
  indicator.fields['threat.indicator.file.hash.md5'] = ['sample_md5_hash'];
  indicator.fields['threat.indicator.file.hash.sha1'] = ['sample_sha1_hash'];
  indicator.fields['threat.indicator.name'] = ['sample_sha256_hash'];
  indicator.fields['threat.indicator.name_origin'] = ['threat.indicator.file.hash.sha256'];

  return indicator;
};
