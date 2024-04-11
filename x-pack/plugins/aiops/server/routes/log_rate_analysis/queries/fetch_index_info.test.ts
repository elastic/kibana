/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import type { ElasticsearchClient } from '@kbn/core/server';

import { paramsSearchQueryMock } from './__mocks__/params_search_query';
import { fieldCapsPgBenchMock } from './__mocks__/field_caps_pgbench';
import { fieldCapsEcommerceMock } from './__mocks__/field_caps_ecommerce';
import { fieldCapsLargeArraysMock } from './__mocks__/field_caps_large_arrays';

import { fetchIndexInfo } from './fetch_index_info';

describe('fetch_index_info', () => {
  describe('fetchFieldCandidates', () => {
    it('returns field candidates and total hits for "my" fields', async () => {
      const esClientFieldCapsMock = jest.fn(() => ({
        fields: {
          // Should end up as a field candidate
          myIpFieldName: { ip: { aggregatable: true } },
          // Should end up as a field candidate
          myKeywordFieldName: { keyword: { aggregatable: true } },
          // Should not end up as a field candidate, it's a keyword but non-aggregatable
          myKeywordFieldNameToBeIgnored: { keyword: { aggregatable: false } },
          // Should not end up as a field candidate, based on this field caps result it would be
          // but it will not be part of the mocked search result so will count as unpopulated.
          myUnpopulatedKeywordFieldName: { keyword: { aggregatable: true } },
          // Should not end up as a field candidate since fields of type number will not be considered
          myNumericFieldName: { number: {} },
        },
      }));
      const esClientSearchMock = jest.fn((req: estypes.SearchRequest): estypes.SearchResponse => {
        return {
          hits: {
            hits: [
              {
                fields: {
                  myIpFieldName: '1.1.1.1',
                  myKeywordFieldName: 'myKeywordFieldValue',
                  myNumericFieldName: 1234,
                },
              },
            ],
            total: { value: 5000000 },
          },
        } as unknown as estypes.SearchResponse;
      });

      const esClientMock = {
        fieldCaps: esClientFieldCapsMock,
        search: esClientSearchMock,
      } as unknown as ElasticsearchClient;

      const { baselineTotalDocCount, deviationTotalDocCount, fieldCandidates } =
        await fetchIndexInfo(esClientMock, paramsSearchQueryMock);

      expect(fieldCandidates).toEqual(['myIpFieldName', 'myKeywordFieldName']);
      expect(baselineTotalDocCount).toEqual(5000000);
      expect(deviationTotalDocCount).toEqual(5000000);
      expect(esClientFieldCapsMock).toHaveBeenCalledTimes(1);
      expect(esClientSearchMock).toHaveBeenCalledTimes(2);
    });

    it('returns field candidates and total hits for pgBench mappings', async () => {
      const esClientFieldCapsMock = jest.fn(() => fieldCapsPgBenchMock);
      const esClientSearchMock = jest.fn((req: estypes.SearchRequest): estypes.SearchResponse => {
        return {
          hits: {
            hits: [
              {
                fields: {
                  '_metadata.elastic_apm_trace_id': 'dummy-value',
                  '_metadata.metadata_event_dataset': 'dummy-value',
                  '_metadata.user_id': 'dummy-value',
                  'agent.version': 'dummy-value',
                  'client.ip': 'dummy-value',
                  'cloud.account.id': 'dummy-value',
                  'cloud.instance.name': 'dummy-value',
                  'container.labels.annotation_io_kubernetes_container_restartCount': 'dummy-value',
                  'container.labels.annotation_io_kubernetes_pod_terminationGracePeriod':
                    'dummy-value',
                  'container.labels.io_kubernetes_container_name': 'dummy-value',
                  'container.labels.io_kubernetes_pod_namespace': 'dummy-value',
                  details: 'dummy-value',
                  elasticapm_span_id: 'dummy-value',
                  elasticapm_transaction_id: 'dummy-value',
                  'event.module': 'dummy-value',
                  'event.timezone': 'dummy-value',
                  'host.hostname': 'dummy-value',
                  'host.os.family': 'dummy-value',
                  'host.os.kernel': 'dummy-value',
                  'host.os.name': 'dummy-value',
                  'host.os.platform': 'dummy-value',
                  hostname: 'dummy-value',
                  'kubernetes.container.name': 'dummy-value',
                  'kubernetes.labels.pod-template-hash': 'dummy-value',
                  'kubernetes.namespace_labels.kubernetes_io/metadata_name': 'dummy-value',
                  'kubernetes.namespace_uid': 'dummy-value',
                  'kubernetes.node.labels.addon_gke_io/node-local-dns-ds-ready': 'dummy-value',
                  'kubernetes.node.labels.beta_kubernetes_io/arch': 'dummy-value',
                  'kubernetes.node.labels.cloud_google_com/gke-boot-disk': 'dummy-value',
                  'kubernetes.node.labels.cloud_google_com/gke-container-runtime': 'dummy-value',
                  'kubernetes.node.labels.cloud_google_com/machine-family': 'dummy-value',
                  'kubernetes.node.labels.kubernetes_io/arch': 'dummy-value',
                  'kubernetes.node.labels.kubernetes_io/os': 'dummy-value',
                  'kubernetes.node.labels.node_kubernetes_io/instance-type': 'dummy-value',
                  'kubernetes.pod.ip': 'dummy-value',
                  'kubernetes.pod.name': 'dummy-value',
                  'log.file.path': 'dummy-value',
                  'log.level': 'dummy-value',
                  name: 'dummy-value',
                  'postgresql.log.database': 'dummy-value',
                  'postgresql.log.query': 'dummy-value',
                  'postgresql.log.timestamp': 'dummy-value',
                  'process.name': 'dummy-value',
                  'req.headers.accept-encoding': 'dummy-value',
                  'req.headers.cache-control': 'dummy-value',
                  'req.headers.origin': 'dummy-value',
                  'req.headers.tracestate': 'dummy-value',
                  'req.headers.x-real-ip': 'dummy-value',
                  'service.name': 'dummy-value',
                  stack: 'dummy-value',
                  'user.name': 'dummy-value',
                },
              },
            ],
            total: { value: 5000000 },
          },
        } as unknown as estypes.SearchResponse;
      });

      const esClientMock = {
        fieldCaps: esClientFieldCapsMock,
        search: esClientSearchMock,
      } as unknown as ElasticsearchClient;

      const {
        baselineTotalDocCount,
        deviationTotalDocCount,
        fieldCandidates,
        textFieldCandidates,
      } = await fetchIndexInfo(esClientMock, paramsSearchQueryMock);

      expect(fieldCandidates).toEqual([
        '_metadata.elastic_apm_trace_id',
        '_metadata.metadata_event_dataset',
        '_metadata.user_id',
        'agent.version',
        'client.ip',
        'cloud.account.id',
        'cloud.instance.name',
        'container.labels.annotation_io_kubernetes_container_restartCount',
        'container.labels.annotation_io_kubernetes_pod_terminationGracePeriod',
        'container.labels.io_kubernetes_container_name',
        'container.labels.io_kubernetes_pod_namespace',
        'details',
        'elasticapm_span_id',
        'elasticapm_transaction_id',
        'event.module',
        'event.timezone',
        'host.hostname',
        'host.os.family',
        'host.os.kernel',
        'host.os.name',
        'host.os.platform',
        'hostname',
        'kubernetes.container.name',
        'kubernetes.labels.pod-template-hash',
        'kubernetes.namespace_labels.kubernetes_io/metadata_name',
        'kubernetes.namespace_uid',
        'kubernetes.node.labels.addon_gke_io/node-local-dns-ds-ready',
        'kubernetes.node.labels.beta_kubernetes_io/arch',
        'kubernetes.node.labels.cloud_google_com/gke-boot-disk',
        'kubernetes.node.labels.cloud_google_com/gke-container-runtime',
        'kubernetes.node.labels.cloud_google_com/machine-family',
        'kubernetes.node.labels.kubernetes_io/arch',
        'kubernetes.node.labels.kubernetes_io/os',
        'kubernetes.node.labels.node_kubernetes_io/instance-type',
        'kubernetes.pod.ip',
        'kubernetes.pod.name',
        'log.file.path',
        'log.level',
        'name',
        'postgresql.log.database',
        'postgresql.log.query',
        'postgresql.log.timestamp',
        'process.name',
        'req.headers.accept-encoding',
        'req.headers.cache-control',
        'req.headers.origin',
        'req.headers.tracestate',
        'req.headers.x-real-ip',
        'service.name',
        'stack',
        'user.name',
      ]);
      expect(textFieldCandidates).toEqual(['error.message', 'message']);
      expect(baselineTotalDocCount).toEqual(5000000);
      expect(deviationTotalDocCount).toEqual(5000000);
      expect(esClientFieldCapsMock).toHaveBeenCalledTimes(1);
      expect(esClientSearchMock).toHaveBeenCalledTimes(2);
    });

    it('returns field candidates and total hits for ecommerce mappings', async () => {
      const esClientFieldCapsMock = jest.fn(() => fieldCapsEcommerceMock);
      const esClientSearchMock = jest.fn((req: estypes.SearchRequest): estypes.SearchResponse => {
        return {
          hits: {
            hits: [
              {
                fields: {
                  'category.keyword': 'dummy-value',
                  currency: 'dummy-value',
                  'customer_first_name.keyword': 'dummy-value',
                  'customer_full_name.keyword': 'dummy-value',
                  customer_gender: 'dummy-value',
                  customer_id: 'dummy-value',
                  'customer_last_name.keyword': 'dummy-value',
                  customer_phone: 'dummy-value',
                  day_of_week: 'dummy-value',
                  email: 'dummy-value',
                  'geoip.city_name': 'dummy-value',
                  'geoip.continent_name': 'dummy-value',
                  'geoip.country_iso_code': 'dummy-value',
                  'geoip.region_name': 'dummy-value',
                  'manufacturer.keyword': 'dummy-value',
                  order_id: 'dummy-value',
                  'products._id.keyword': 'dummy-value',
                  'products.category.keyword': 'dummy-value',
                  'products.manufacturer.keyword': 'dummy-value',
                  'products.product_name.keyword': 'dummy-value',
                  'products.sku': 'dummy-value',
                  sku: 'dummy-value',
                  type: 'dummy-value',
                  user: 'dummy-value',
                },
              },
            ],
            total: { value: 5000000 },
          },
        } as unknown as estypes.SearchResponse;
      });

      const esClientMock = {
        fieldCaps: esClientFieldCapsMock,
        search: esClientSearchMock,
      } as unknown as ElasticsearchClient;

      const {
        baselineTotalDocCount,
        deviationTotalDocCount,
        fieldCandidates,
        textFieldCandidates,
      } = await fetchIndexInfo(esClientMock, paramsSearchQueryMock);

      expect(fieldCandidates).toEqual([
        'category.keyword',
        'currency',
        'customer_first_name.keyword',
        'customer_full_name.keyword',
        'customer_gender',
        'customer_id',
        'customer_last_name.keyword',
        'customer_phone',
        'day_of_week',
        'email',
        'geoip.city_name',
        'geoip.continent_name',
        'geoip.country_iso_code',
        'geoip.region_name',
        'manufacturer.keyword',
        'order_id',
        'products._id.keyword',
        'products.category.keyword',
        'products.manufacturer.keyword',
        'products.product_name.keyword',
        'products.sku',
        'sku',
        'type',
        'user',
      ]);
      expect(textFieldCandidates).toEqual([]);
      expect(baselineTotalDocCount).toEqual(5000000);
      expect(deviationTotalDocCount).toEqual(5000000);
      expect(esClientFieldCapsMock).toHaveBeenCalledTimes(1);
      expect(esClientSearchMock).toHaveBeenCalledTimes(2);
    });

    it('returns field candidates and total hits for large-arrays mappings', async () => {
      const esClientFieldCapsMock = jest.fn(() => fieldCapsLargeArraysMock);
      const esClientSearchMock = jest.fn((req: estypes.SearchRequest): estypes.SearchResponse => {
        return {
          hits: {
            hits: [{ fields: { items: [1, 2, 3] } }],
            total: { value: 5000000 },
          },
        } as unknown as estypes.SearchResponse;
      });

      const esClientMock = {
        fieldCaps: esClientFieldCapsMock,
        search: esClientSearchMock,
      } as unknown as ElasticsearchClient;

      const {
        baselineTotalDocCount,
        deviationTotalDocCount,
        fieldCandidates,
        textFieldCandidates,
      } = await fetchIndexInfo(esClientMock, paramsSearchQueryMock);

      expect(fieldCandidates).toEqual(['items']);
      expect(textFieldCandidates).toEqual([]);
      expect(baselineTotalDocCount).toEqual(5000000);
      expect(deviationTotalDocCount).toEqual(5000000);
      expect(esClientFieldCapsMock).toHaveBeenCalledTimes(1);
      expect(esClientSearchMock).toHaveBeenCalledTimes(2);
    });
  });
});
