/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MonitoringConfig } from '../..';
import { getNewIndexPatterns } from './get_index_patterns';

const getConfigWithCcs = (ccsEnabled: boolean, remotePatterns: string | string[] = ['*']) => {
  return {
    ui: {
      ccs: {
        enabled: ccsEnabled,
      },
    },
  } as MonitoringConfig;
};

describe('getNewIndexPatterns', () => {
  beforeEach(() => {
    jest.resetModules();
  });
  it('returns local elasticsearch index patterns when ccs is enabled (default true) and no ccs payload', () => {
    const indexPatterns = getNewIndexPatterns({
      config: getConfigWithCcs(true),
      moduleType: 'elasticsearch',
    });
    expect(indexPatterns).toBe('.monitoring-es-*,metrics-elasticsearch.*-*');
  });
  it('returns ecs only elasticsearch index patterns when specifying ecsLegacyOnly: true', () => {
    const indexPatterns = getNewIndexPatterns({
      config: getConfigWithCcs(true),
      moduleType: 'elasticsearch',
      ecsLegacyOnly: true,
    });
    expect(indexPatterns).toBe('.monitoring-es-8-*,metrics-elasticsearch.*-*');
  });
  it('returns local kibana index patterns when ccs is enabled with no ccs payload', () => {
    const indexPatterns = getNewIndexPatterns({
      config: getConfigWithCcs(true),
      moduleType: 'kibana',
    });
    expect(indexPatterns).toBe('.monitoring-kibana-*,metrics-kibana.*-*');
  });
  it('returns logstash index patterns when ccs is enabled and no ccs payload', () => {
    const indexPatterns = getNewIndexPatterns({
      config: getConfigWithCcs(true),
      moduleType: 'logstash',
    });
    expect(indexPatterns).toBe('.monitoring-logstash-*,metrics-logstash.*-*');
  });
  it('returns beats index patterns when ccs is enabled and no ccs payload', () => {
    const indexPatterns = getNewIndexPatterns({
      config: getConfigWithCcs(true),
      moduleType: 'beats',
    });
    expect(indexPatterns).toBe('.monitoring-beats-*,metrics-beats.*-*');
  });
  it('returns elasticsearch index patterns with dataset', () => {
    const indexPatterns = getNewIndexPatterns({
      config: getConfigWithCcs(true),
      moduleType: 'elasticsearch',
      dataset: 'cluster_stats',
    });
    expect(indexPatterns).toBe('.monitoring-es-*,metrics-elasticsearch.cluster_stats-*');
  });
  it('returns elasticsearch index patterns without ccs prefixes when ccs is disabled', () => {
    const indexPatterns = getNewIndexPatterns({
      config: getConfigWithCcs(false),
      moduleType: 'elasticsearch',
    });
    expect(indexPatterns).toBe('.monitoring-es-*,metrics-elasticsearch.*-*');
  });
  it('returns elasticsearch index patterns without ccs prefixes when ccs is disabled but ccs has a value', () => {
    const indexPatterns = getNewIndexPatterns({
      config: getConfigWithCcs(false),
      ccs: 'myccs',
      moduleType: 'elasticsearch',
    });
    expect(indexPatterns).toBe('.monitoring-es-*,metrics-elasticsearch.*-*');
  });
  it('returns elasticsearch index patterns with custom ccs prefixes when ccs is enabled and ccs has a value', () => {
    const indexPatterns = getNewIndexPatterns({
      config: getConfigWithCcs(true),
      ccs: 'myccs',
      moduleType: 'elasticsearch',
    });
    expect(indexPatterns).toBe('myccs:.monitoring-es-*,myccs:metrics-elasticsearch.*-*');
  });
  it('returns elasticsearch index patterns with ccs prefixes and local index patterns when ccs is enabled and ccs value is *', () => {
    const indexPatterns = getNewIndexPatterns({
      config: getConfigWithCcs(true),
      ccs: '*',
      moduleType: 'elasticsearch',
    });
    expect(indexPatterns).toBe(
      '*:.monitoring-es-*,.monitoring-es-*,*:metrics-elasticsearch.*-*,metrics-elasticsearch.*-*'
    );
  });
  it('returns elasticsearch index patterns with ccs prefixes and local index patterns when monitoring.ui.ccs.enabled: true and ccs value is an array with default', () => {
    const indexPatterns = getNewIndexPatterns({
      config: getConfigWithCcs(true),
      ccs: ['*'],
      moduleType: 'elasticsearch',
    });
    expect(indexPatterns).toBe(
      '*:.monitoring-es-*,.monitoring-es-*,*:metrics-elasticsearch.*-*,metrics-elasticsearch.*-*'
    );
  });
  it('returns elasticsearch index patterns with ccs prefixes when monitoring.ui.ccs.enabled: true and ccs value is an array with multiple custom values', () => {
    const indexPatterns = getNewIndexPatterns({
      config: getConfigWithCcs(true),
      ccs: ['myremote', 'myremote2'],
      moduleType: 'elasticsearch',
    });
    expect(indexPatterns).toBe(
      'myremote:.monitoring-es-*,myremote2:.monitoring-es-*,myremote:metrics-elasticsearch.*-*,myremote2:metrics-elasticsearch.*-*'
    );
  });
});
