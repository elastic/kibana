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
  FileSSDeep = 'threat.indicator.file.ssdeep',
  FileTlsh = 'threat.indicator.file.tlsh',
  FileImpfuzzy = 'threat.indicator.file.impfuzzy',
  FileImphash = 'threat.indicator.file.imphash',
  FilePehash = 'threat.indicator.file.pehash',
  FileVhash = 'threat.indicator.file.vhash',
  X509Serial = 'threat.indicator.x509.serial_number',
  WindowsRegistryKey = 'threat.indicator.registry.key',
  AutonomousSystemNumber = 'threat.indicator.as.number',
  MacAddress = 'threat.indicator.mac',
  TimeStamp = '@timestamp',
  Id = '_id',
  Name = 'threat.indicator.name',
  NameOrigin = 'threat.indicator.name_origin',
}

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
export const generateMockBaseIndicator = (): Indicator => ({
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

  indicator.fields['threat.indicator.type'] = ['ipv4-addr'];
  indicator.fields['threat.indicator.ip'] = ['12.68.554.87'];
  indicator.fields['threat.indicator.name'] = ['12.68.554.87'];

  return indicator;
};
