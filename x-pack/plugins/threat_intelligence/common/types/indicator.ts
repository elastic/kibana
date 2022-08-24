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
  FileMd5 = 'threat.indicator.file.hash.md5',
  FileSha256 = 'threat.indicator.file.hash.sha256',
  TimeStamp = '@timestamp',
}

/**
 * Threat Intelligence Indicator interface.
 */
export interface Indicator {
  _id?: unknown;
  fields: Partial<Record<RawIndicatorFieldId, unknown[]>>;
}

/**
 * Used to create new Indicators, used mainly in jest unit tests and Storybook stories.
 */
export const generateMockIndicator = (): Indicator => ({
  fields: {
    '@timestamp': ['2022-01-01T01:01:01.000Z'],
    'threat.indicator.type': ['ipv4-addr'],
    'threat.indicator.ip': ['12.68.554.87'],
    'threat.indicator.first_seen': ['2022-01-01T01:01:01.000Z'],
    'threat.feed.name': ['[Filebeat] AbuseCH Malware'],
  },
  _id: Math.random(),
});

/**
 * Used to create new url-type Indicators, used mainly in jest unit tests and Storybook stories.
 */
export const generateMockUrlIndicator = (): Indicator => {
  const indicator = generateMockIndicator();

  indicator.fields['threat.indicator.type'] = ['url'];
  indicator.fields['threat.indicator.url.full'] = ['https://google.com'];

  return indicator;
};

/**
 * Used to create new file-type Indicators, used mainly in jest unit tests and Storybook stories.
 */
export const generateMockFileIndicator = (): Indicator => {
  const indicator = generateMockIndicator();

  indicator.fields['threat.indicator.type'] = ['file'];
  indicator.fields['threat.indicator.file.hash.sha256'] = ['sample_sha256_hash'];

  return indicator;
};
