/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import sinon from 'sinon';
import { getNewIndexPatterns } from './get_index_patterns';
import { LegacyRequest, LegacyServer } from '../../types';

const getReqMock = ({ ccsEnabled = true }: { ccsEnabled?: boolean } = {}) => {
  return {
    payload: {},
    server: {
      config() {
        return {
          get: sinon.stub().withArgs('server.monitoring.ui.ccs.enabled').returns(ccsEnabled),
        };
      },
    },
  } as unknown as LegacyRequest;
};
describe('getNewIndexPatterns', () => {
  it('returns elasticsearch index patterns when ccs is enabled (default true)', () => {
    const indexPatterns = getNewIndexPatterns({ req: getReqMock(), moduleType: 'elasticsearch' });
    expect(indexPatterns).toBe(
      '*:.monitoring-es-6-*,*:.monitoring-es-7-*,*:metrics-elasticsearch.*-*,.monitoring-es-6-*,.monitoring-es-7-*,metrics-elasticsearch.*-*'
    );
  });
  it('returns kibana index patterns when ccs is enabled', () => {
    const indexPatterns = getNewIndexPatterns({ req: getReqMock(), moduleType: 'kibana' });
    expect(indexPatterns).toBe(
      '*:.monitoring-kibana-6-*,*:.monitoring-kibana-7-*,*:metrics-kibana.*-*,.monitoring-kibana-6-*,.monitoring-kibana-7-*,metrics-kibana.*-*'
    );
  });
  it('returns logstash index patterns when ccs is enabled', () => {
    const indexPatterns = getNewIndexPatterns({ req: getReqMock(), moduleType: 'logstash' });
    expect(indexPatterns).toBe(
      '*:.monitoring-logstash-6-*,*:.monitoring-logstash-7-*,*:metrics-logstash.*-*,.monitoring-logstash-6-*,.monitoring-logstash-7-*,metrics-logstash.*-*'
    );
  });
  it('returns beats index patterns when ccs is enabled', () => {
    const indexPatterns = getNewIndexPatterns({ req: getReqMock(), moduleType: 'beats' });
    expect(indexPatterns).toBe(
      '*:.monitoring-beats-6-*,*:.monitoring-beats-7-*,*:metrics-beats.*-*,.monitoring-beats-6-*,.monitoring-beats-7-*,metrics-beats.*-*'
    );
  });
  it('returns elasticsearch index patterns with dataset', () => {
    const indexPatterns = getNewIndexPatterns({
      req: getReqMock(),
      moduleType: 'elasticsearch',
      dataset: 'cluster_stats',
    });
    expect(indexPatterns).toBe(
      '*:.monitoring-es-6-*,*:.monitoring-es-7-*,*:metrics-elasticsearch.cluster_stats-*,.monitoring-es-6-*,.monitoring-es-7-*,metrics-elasticsearch.cluster_stats-*'
    );
  });
  it('returns elasticsearch index patterns without ccs prefixes when ccs is disabled', () => {
    const indexPatterns = getNewIndexPatterns({
      req: getReqMock({ ccsEnabled: false }),
      moduleType: 'elasticsearch',
    });
    expect(indexPatterns).toBe('.monitoring-es-6-*,.monitoring-es-7-*,metrics-elasticsearch.*-*');
  });
  it('returns elasticsearch index patterns without ccs prefixes when ccs is disabled but ccs request payload has a value', () => {
    const req = getReqMock({ ccsEnabled: false });
    req.payload.ccs = 'myccs';
    const indexPatterns = getNewIndexPatterns({
      req,
      moduleType: 'elasticsearch',
    });
    expect(indexPatterns).toBe('.monitoring-es-6-*,.monitoring-es-7-*,metrics-elasticsearch.*-*');
  });
  it('returns elasticsearch index patterns with custom ccs prefixes when ccs is enabled and ccs request payload has a value', () => {
    const req = getReqMock();
    req.payload.ccs = 'myccs';
    const indexPatterns = getNewIndexPatterns({
      req,
      moduleType: 'elasticsearch',
    });
    expect(indexPatterns).toBe(
      'myccs:.monitoring-es-6-*,myccs:.monitoring-es-7-*,myccs:metrics-elasticsearch.*-*'
    );
  });
  it('returns elasticsearch index patterns with ccs prefixes and local index patterns when ccs is enabled and ccs request payload value is *', () => {
    const req = getReqMock();
    req.payload.ccs = '*';
    const indexPatterns = getNewIndexPatterns({
      req,
      moduleType: 'elasticsearch',
    });
    expect(indexPatterns).toBe(
      '*:.monitoring-es-6-*,*:.monitoring-es-7-*,*:metrics-elasticsearch.*-*,.monitoring-es-6-*,.monitoring-es-7-*,metrics-elasticsearch.*-*'
    );
  });
});
