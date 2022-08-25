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

  return indicator;
};

export const generateMockIpIndicator = generateMockIndicator;

export const generateMockUrlIndicator = (): Indicator => {
  const indicator = generateMockBaseIndicator();

  indicator.fields['threat.indicator.type'] = ['url'];
  indicator.fields['threat.indicator.url.original'] = ['https://google.com'];

  return indicator;
};

export const generateMockFileIndicator = (): Indicator => {
  const indicator = generateMockBaseIndicator();

  indicator.fields['threat.indicator.type'] = ['file'];
  indicator.fields['threat.indicator.file.hash.sha256'] = ['sample_sha256_hash'];
  indicator.fields['threat.indicator.file.hash.md5'] = ['sample_md5_hash'];
  indicator.fields['threat.indicator.file.hash.sha1'] = ['sample_sha1_hash'];

  return indicator;
};

export const generateMockFileMd5Indicator = (): Indicator => {
  const indicator = generateMockBaseIndicator();

  indicator.fields['threat.indicator.type'] = ['file'];
  indicator.fields['threat.indicator.file.hash.md5'] = ['sample_md5_hash'];
  indicator.fields['threat.indicator.file.hash.sha1'] = ['sample_sha1_hash'];

  return indicator;
};

export const generateMockEmailAddrIndicator = (): Indicator => {
  const indicator = generateMockBaseIndicator();

  indicator.fields['threat.indicator.type'] = ['email-addr'];
  indicator.fields['threat.indicator.email.address'] = ['sample@example.com'];

  return indicator;
};

export const generateMockDomainIndicator = (): Indicator => {
  const indicator = generateMockBaseIndicator();

  indicator.fields['threat.indicator.type'] = ['domain'];
  indicator.fields['threat.indicator.url.domain'] = ['google.com'];

  return indicator;
};

export const generateMockDomainNameIndicator = (): Indicator => {
  const indicator = generateMockBaseIndicator();

  indicator.fields['threat.indicator.type'] = ['domain-name'];
  indicator.fields['threat.indicator.url.domain'] = ['google.com'];

  return indicator;
};

export const generateMockX509CertificateIndicator = (): Indicator => {
  const indicator = generateMockBaseIndicator();

  indicator.fields['threat.indicator.type'] = ['x509-certificate'];
  indicator.fields['threat.indicator.x509.serial_number'] = ['sample_serial_number'];

  return indicator;
};

export const generateMockX509SerialIndicator = (): Indicator => {
  const indicator = generateMockBaseIndicator();

  indicator.fields['threat.indicator.type'] = ['x509 Serial'];
  indicator.fields['threat.indicator.x509.serial_number'] = ['sample_serial_bla'];

  return indicator;
};

export const generateMockUnknownIndicator = (): Indicator => {
  const indicator = generateMockBaseIndicator();

  indicator.fields['threat.indicator.type'] = ['unknown'];
  indicator.fields._id = ['sample_id'];

  return indicator;
};

export const generateMockEmailIndicator = (): Indicator => {
  const indicator = generateMockBaseIndicator();

  indicator.fields['threat.indicator.type'] = ['email'];
  indicator.fields['threat.indicator.email.address'] = ['sample@example.com'];

  return indicator;
};

export const generateMockEmailMessageIndicator = (): Indicator => {
  const indicator = generateMockBaseIndicator();

  indicator.fields['threat.indicator.type'] = ['email-message'];

  return indicator;
};

export const generateMockWindowsRegistryKeyIndicator = (): Indicator => {
  const indicator = generateMockBaseIndicator();

  indicator.fields['threat.indicator.type'] = ['windows-registry-key'];
  indicator.fields['threat.indicator.registry.key'] = ['sample_registry_key'];

  return indicator;
};

export const generateMockAutonomousSystemIndicator = (): Indicator => {
  const indicator = generateMockBaseIndicator();

  indicator.fields['threat.indicator.type'] = ['autonomous-system'];
  indicator.fields['threat.indicator.as.number'] = ['sample_as_number'];

  return indicator;
};

export const generateMockMacAddressIndicator = (): Indicator => {
  const indicator = generateMockBaseIndicator();

  indicator.fields['threat.indicator.type'] = ['mac-addr'];
  indicator.fields['threat.indicator.mac'] = ['sample_mac_address'];

  return indicator;
};
