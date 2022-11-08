/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ENRICHMENT_DESTINATION_PATH } from '../constants';

export const MATCHED_ATOMIC = 'matched.atomic';
export const MATCHED_FIELD = 'matched.field';
export const MATCHED_ID = 'matched.id';
export const MATCHED_TYPE = 'matched.type';
export const INDICATOR_MATCH_SUBFIELDS = [MATCHED_ATOMIC, MATCHED_FIELD, MATCHED_TYPE];

export const INDICATOR_MATCHED_ATOMIC = `${ENRICHMENT_DESTINATION_PATH}.${MATCHED_ATOMIC}`;
export const INDICATOR_MATCHED_FIELD = `${ENRICHMENT_DESTINATION_PATH}.${MATCHED_FIELD}`;
export const INDICATOR_MATCHED_TYPE = `${ENRICHMENT_DESTINATION_PATH}.${MATCHED_TYPE}`;

export const EVENT_DATASET = 'event.dataset';

export const FIRST_SEEN = 'indicator.first_seen';
export const LAST_SEEN = 'indicator.last_seen';
export const PROVIDER = 'indicator.provider';
export const REFERENCE = 'indicator.reference';

export const INDICATOR_FIRSTSEEN = `${ENRICHMENT_DESTINATION_PATH}.${FIRST_SEEN}`;
export const INDICATOR_LASTSEEN = `${ENRICHMENT_DESTINATION_PATH}.${LAST_SEEN}`;
export const INDICATOR_PROVIDER = `${ENRICHMENT_DESTINATION_PATH}.${PROVIDER}`;
export const INDICATOR_REFERENCE = `${ENRICHMENT_DESTINATION_PATH}.${REFERENCE}`;

export const CTI_ROW_RENDERER_FIELDS = [
  INDICATOR_MATCHED_ATOMIC,
  INDICATOR_MATCHED_FIELD,
  INDICATOR_MATCHED_TYPE,
  INDICATOR_REFERENCE,
  INDICATOR_PROVIDER,
];

export enum ENRICHMENT_TYPES {
  InvestigationTime = 'investigation_time',
  IndicatorMatchRule = 'indicator_match_rule',
}

export const EVENT_ENRICHMENT_INDICATOR_FIELD_MAP = {
  'file.hash.md5': 'threatintel.indicator.file.hash.md5',
  'file.hash.sha1': 'threatintel.indicator.file.hash.sha1',
  'file.hash.sha256': 'threatintel.indicator.file.hash.sha256',
  'file.pe.imphash': 'threatintel.indicator.file.pe.imphash',
  'file.elf.telfhash': 'threatintel.indicator.file.elf.telfhash',
  'file.hash.ssdeep': 'threatintel.indicator.file.hash.ssdeep',
  'source.ip': 'threatintel.indicator.ip',
  'destination.ip': 'threatintel.indicator.ip',
  'url.full': 'threatintel.indicator.url.full',
  'registry.path': 'threatintel.indicator.registry.path',
};

export const DEFAULT_EVENT_ENRICHMENT_FROM = 'now-30d';
export const DEFAULT_EVENT_ENRICHMENT_TO = 'now';

export const CTI_DATASET_KEY_MAP: { [key: string]: string } = {
  'Abuse URL': 'threatintel.abuseurl',
  'Abuse Malware': 'threatintel.abusemalware',
  'AlienVault OTX': 'threatintel.otx',
  Anomali: 'threatintel.anomali',
  'Malware Bazaar': 'threatintel.malwarebazaar',
  MISP: 'threatintel.misp',
  'Recorded Future': 'threatintel.recordedfuture',
};
