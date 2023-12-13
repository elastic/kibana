/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Integration } from './integration';
import { DataStreamStatType, IntegrationType } from './types';

export class DataStreamStat {
  name: DataStreamStatType['name'];
  title: string;
  size?: DataStreamStatType['size'];
  sizeBytes?: DataStreamStatType['size_bytes'];
  lastActivity?: DataStreamStatType['last_activity'];
  integration?: IntegrationType;
  degradedDocs?: number;

  private constructor(dataStreamStat: DataStreamStat) {
    this.name = dataStreamStat.name;
    this.title = dataStreamStat.title ?? dataStreamStat.name;
    this.size = dataStreamStat.size;
    this.sizeBytes = dataStreamStat.sizeBytes;
    this.lastActivity = dataStreamStat.lastActivity;
    this.integration = dataStreamStat.integration;
    this.degradedDocs = dataStreamStat.degradedDocs;
  }

  public static create(dataStreamStat: DataStreamStatType) {
    const [_type, dataset, namespace] = dataStreamStat.name.split('-');

    const dataStreamStatProps = {
      name: dataStreamStat.name,
      title: `${dataset}-${namespace}`,
      size: dataStreamStat.size,
      sizeBytes: dataStreamStat.size_bytes,
      lastActivity: dataStreamStat.last_activity,
      integration: dataStreamStat.integration
        ? Integration.create(dataStreamStat.integration)
        : undefined,
    };

    return new DataStreamStat(dataStreamStatProps);
  }
}
