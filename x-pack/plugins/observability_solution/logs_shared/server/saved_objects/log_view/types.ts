/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isoToEpochRt } from '@kbn/io-ts-utils';
import * as rt from 'io-ts';
import { savedObjectReferenceRT } from '../references';

export const logDataViewSavedObjectReferenceRT = rt.type({
  type: rt.literal('data_view'),
  dataViewId: rt.string,
});

export const logIndexNameSavedObjectReferenceRT = rt.type({
  type: rt.literal('index_name'),
  indexName: rt.string,
});

export const logIndexSavedObjectReferenceRT = rt.union([
  logDataViewSavedObjectReferenceRT,
  logIndexNameSavedObjectReferenceRT,
]);

const logViewSavedObjectCommonColumnConfigurationRT = rt.strict({
  id: rt.string,
});

const logViewSavedObjectTimestampColumnConfigurationRT = rt.strict({
  timestampColumn: logViewSavedObjectCommonColumnConfigurationRT,
});

const logViewSavedObjectMessageColumnConfigurationRT = rt.strict({
  messageColumn: logViewSavedObjectCommonColumnConfigurationRT,
});

export const logViewSavedObjectFieldColumnConfigurationRT = rt.strict({
  fieldColumn: rt.intersection([
    logViewSavedObjectCommonColumnConfigurationRT,
    rt.strict({
      field: rt.string,
    }),
  ]),
});

export const logViewSavedObjectColumnConfigurationRT = rt.union([
  logViewSavedObjectTimestampColumnConfigurationRT,
  logViewSavedObjectMessageColumnConfigurationRT,
  logViewSavedObjectFieldColumnConfigurationRT,
]);

export const logViewSavedObjectAttributesRT = rt.strict({
  name: rt.string,
  description: rt.string,
  logIndices: logIndexSavedObjectReferenceRT,
  logColumns: rt.array(logViewSavedObjectColumnConfigurationRT),
});

export type LogViewSavedObjectAttributes = rt.TypeOf<typeof logViewSavedObjectAttributesRT>;

export const logViewSavedObjectRT = rt.intersection([
  rt.type({
    id: rt.string,
    attributes: logViewSavedObjectAttributesRT,
    references: rt.array(savedObjectReferenceRT),
  }),
  rt.partial({
    version: rt.string,
    updated_at: isoToEpochRt,
  }),
]);
