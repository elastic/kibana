/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Integration } from './integration';
import { DataStreamStatType, IntegrationType } from './types';

export class DataStreamStat {
  rawName: string;
  name: DataStreamStatType['name'];
  namespace: string;
  title: string;
  size?: DataStreamStatType['size'];
  sizeBytes?: DataStreamStatType['sizeBytes'];
  lastActivity?: DataStreamStatType['lastActivity'];
  integration?: IntegrationType;
  degradedDocs?: number;

  private constructor(dataStreamStat: DataStreamStat) {
    this.rawName = dataStreamStat.name;
    this.name = dataStreamStat.name;
    this.title = dataStreamStat.title ?? dataStreamStat.name;
    this.namespace = dataStreamStat.namespace;
    this.size = dataStreamStat.size;
    this.sizeBytes = dataStreamStat.sizeBytes;
    this.lastActivity = dataStreamStat.lastActivity;
    this.integration = dataStreamStat.integration;
    this.degradedDocs = dataStreamStat.degradedDocs;
  }

  public static create(dataStreamStat: DataStreamStatType) {
    const [_type, dataset, namespace] = dataStreamStat.name.split('-');

    const dataStreamStatProps = {
      rawName: dataStreamStat.name,
      name: dataset,
      title: dataStreamStat.integration?.datasets?.[dataset] ?? dataset,
      namespace,
      size: dataStreamStat.size,
      sizeBytes: dataStreamStat.sizeBytes,
      lastActivity: dataStreamStat.lastActivity,
      integration: dataStreamStat.integration
        ? Integration.create(dataStreamStat.integration)
        : undefined,
    };

    return new DataStreamStat(dataStreamStatProps);
  }
}
