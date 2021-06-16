/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { INDICATOR_DESTINATION_PATH } from '../constants';

export const MATCHED_ATOMIC = 'matched.atomic';
export const MATCHED_FIELD = 'matched.field';
export const MATCHED_TYPE = 'matched.type';
export const INDICATOR_MATCH_SUBFIELDS = [MATCHED_ATOMIC, MATCHED_FIELD, MATCHED_TYPE];

export const INDICATOR_MATCHED_ATOMIC = `${INDICATOR_DESTINATION_PATH}.${MATCHED_ATOMIC}`;
export const INDICATOR_MATCHED_FIELD = `${INDICATOR_DESTINATION_PATH}.${MATCHED_FIELD}`;
export const INDICATOR_MATCHED_TYPE = `${INDICATOR_DESTINATION_PATH}.${MATCHED_TYPE}`;

export const EVENT_DATASET = 'event.dataset';
export const EVENT_REFERENCE = 'event.reference';
export const PROVIDER = 'provider';
export const FIRSTSEEN = 'first_seen';

export const INDICATOR_DATASET = `${INDICATOR_DESTINATION_PATH}.${EVENT_DATASET}`;
export const INDICATOR_EVENT_URL = `${INDICATOR_DESTINATION_PATH}.event.url`;
export const INDICATOR_FIRSTSEEN = `${INDICATOR_DESTINATION_PATH}.${FIRSTSEEN}`;
export const INDICATOR_LASTSEEN = `${INDICATOR_DESTINATION_PATH}.last_seen`;
export const INDICATOR_PROVIDER = `${INDICATOR_DESTINATION_PATH}.${PROVIDER}`;
export const INDICATOR_REFERENCE = `${INDICATOR_DESTINATION_PATH}.${EVENT_REFERENCE}`;

export const CTI_ROW_RENDERER_FIELDS = [
  INDICATOR_MATCHED_ATOMIC,
  INDICATOR_MATCHED_FIELD,
  INDICATOR_MATCHED_TYPE,
  INDICATOR_DATASET,
  INDICATOR_REFERENCE,
  INDICATOR_PROVIDER,
];

export const SORTED_THREAT_SUMMARY_FIELDS = [
  INDICATOR_MATCHED_FIELD,
  INDICATOR_MATCHED_TYPE,
  INDICATOR_PROVIDER,
  INDICATOR_FIRSTSEEN,
  INDICATOR_LASTSEEN,
];

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
