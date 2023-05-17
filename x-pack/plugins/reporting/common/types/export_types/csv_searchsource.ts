/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SerializedSearchSourceFields } from '@kbn/data-plugin/common';
import { LocatorPublic } from '@kbn/share-plugin/common';
import { SerializableRecord } from '@kbn/utility-types';
import type { BaseParams, BasePayload } from '../base';
import { LocatorParams } from '../url';

interface BaseParamsCSV {
  searchSource: SerializedSearchSourceFields;
  columns?: string[];
  locator: LocatorPublic<SerializableRecord>;
  locatorParams: LocatorParams[];
}

export type JobParamsCSV = BaseParamsCSV & BaseParams;
export type TaskPayloadCSV = BaseParamsCSV & BasePayload;
