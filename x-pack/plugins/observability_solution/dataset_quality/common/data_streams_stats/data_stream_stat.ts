/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_DEGRADED_DOCS } from '../constants';
import { DataStreamType, QualityIndicators } from '../types';
import { indexNameToDataStreamParts, mapPercentageToQuality } from '../utils';
import { Integration } from './integration';
import { DegradedDocsStat } from './malformed_docs_stat';
import { DataStreamStatType } from './types';

export class DataStreamStat {
  rawName: string;
  type: DataStreamType;
  name: DataStreamStatType['name'];
  namespace: string;
  title: string;
  size?: DataStreamStatType['size']; // total datastream size
  sizeBytes?: DataStreamStatType['sizeBytes']; // total datastream size
  lastActivity?: DataStreamStatType['lastActivity'];
  docsCount?: DataStreamStatType['docsCount']; // docs count in the filtered time range
  integration?: Integration;
  degradedDocs: {
    percentage: number;
    count: number;
    totalDocs: number; // total datastream docs count
    quality: QualityIndicators;
  };

  private constructor(dataStreamStat: DataStreamStat) {
    this.rawName = dataStreamStat.rawName;
    this.type = dataStreamStat.type;
    this.name = dataStreamStat.name;
    this.title = dataStreamStat.title ?? dataStreamStat.name;
    this.namespace = dataStreamStat.namespace;
    this.size = dataStreamStat.size;
    this.sizeBytes = dataStreamStat.sizeBytes;
    this.lastActivity = dataStreamStat.lastActivity;
    this.docsCount = dataStreamStat.docsCount;
    this.integration = dataStreamStat.integration;
    this.degradedDocs = {
      percentage: dataStreamStat.degradedDocs.percentage,
      count: dataStreamStat.degradedDocs.count,
      totalDocs: dataStreamStat.degradedDocs.totalDocs,
      quality: dataStreamStat.degradedDocs.quality,
    };
  }

  public static create(dataStreamStat: DataStreamStatType) {
    const { type, dataset, namespace } = indexNameToDataStreamParts(dataStreamStat.name);

    const dataStreamStatProps = {
      rawName: dataStreamStat.name,
      type,
      name: dataset,
      title: dataset,
      namespace,
      size: dataStreamStat.size,
      sizeBytes: dataStreamStat.sizeBytes,
      lastActivity: dataStreamStat.lastActivity,
      docsCount: dataStreamStat.docsCount,
      degradedDocs: DEFAULT_DEGRADED_DOCS,
    };

    return new DataStreamStat(dataStreamStatProps);
  }

  public static fromDegradedDocStat({
    degradedDocStat,
    datasetIntegrationMap,
  }: {
    degradedDocStat: DegradedDocsStat;
    datasetIntegrationMap: Record<string, { integration: Integration; title: string }>;
  }) {
    const { type, dataset, namespace } = indexNameToDataStreamParts(degradedDocStat.dataset);

    const dataStreamStatProps = {
      rawName: degradedDocStat.dataset,
      type,
      name: dataset,
      title: datasetIntegrationMap[dataset]?.title || dataset,
      namespace,
      integration: datasetIntegrationMap[dataset]?.integration,
      degradedDocs: {
        percentage: degradedDocStat.percentage,
        count: degradedDocStat.count,
        totalDocs: degradedDocStat.totalDocs,
        quality: mapPercentageToQuality(degradedDocStat.percentage),
      },
    };

    return new DataStreamStat(dataStreamStatProps);
  }

  public static calculateFilteredSize({ sizeBytes, docsCount, degradedDocs }: DataStreamStat) {
    const avgDocSize = sizeBytes && docsCount ? sizeBytes / docsCount : 0;
    return avgDocSize * degradedDocs.totalDocs;
  }
}
