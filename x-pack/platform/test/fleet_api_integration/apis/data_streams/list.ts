/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { keyBy } from 'lodash';
import { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { skipIfNoDockerRegistry } from '../../helpers';

interface IndexResponse {
  _id: string;
  _index: string;
}
export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const supertest = getService('supertest');
  const es = getService('es');
  const retry = getService('retry');
  const pkgName = 'datastreams';
  const pkgVersion = '0.1.0';
  const logsTemplateName = `logs-${pkgName}.test_logs`;
  const metricsTemplateName = `metrics-${pkgName}.test_metrics`;
  const notFleetTemplateName = `metrics-${pkgName}.test_metrics_not_fleet`;

  const uninstallPackage = async (name: string, version: string) => {
    await supertest.delete(`/api/fleet/epm/packages/${name}/${version}`).set('kbn-xsrf', 'xxxx');
  };

  const installPackage = async (name: string, version: string) => {
    return await supertest
      .post(`/api/fleet/epm/packages/${name}/${version}`)
      .set('kbn-xsrf', 'xxxx')
      .send({ force: true })
      .expect(200);
  };

  const seedDataStreams = async () => {
    const responses = [];
    responses.push(
      await es.transport.request({
        method: 'POST',
        path: `/${logsTemplateName}-default/_doc`,
        body: {
          '@timestamp': '2015-01-01',
          logs_test_name: 'test',
          data_stream: {
            dataset: `${pkgName}.test_logs`,
            namespace: 'default',
            type: 'logs',
          },
        },
      })
    );
    responses.push(
      await es.transport.request({
        method: 'POST',
        path: `/${metricsTemplateName}-default/_doc`,
        body: {
          '@timestamp': '2015-01-01',
          logs_test_name: 'test',
          data_stream: {
            dataset: `${pkgName}.test_metrics`,
            namespace: 'default',
            type: 'metrics',
          },
        },
      })
    );

    // This stream should never be returned as it is not
    // managed by fleet (it isnt added to a fleet managed data stream)
    responses.push(
      await es.transport.request({
        method: 'POST',
        path: `/${notFleetTemplateName}-default/_doc`,
        body: {
          '@timestamp': '2015-01-01',
          logs_test_name: 'test',
          data_stream: {
            dataset: `${pkgName}.test_metrics_not_fleet`,
            namespace: 'default',
            type: 'metrics',
          },
        },
      })
    );

    return responses as IndexResponse[];
  };

  const getSeedDocsFromResponse = async (indexResponses: IndexResponse[]) =>
    Promise.all(
      indexResponses.map((indexResponse) =>
        es.transport.request({
          method: 'GET',
          path: `/${indexResponse._index}/_doc/${indexResponse._id}`,
        })
      )
    );

  const getDataStreams = async () => {
    return await supertest.get(`/api/fleet/data_streams`).set('kbn-xsrf', 'xxxx');
  };

  // Failing ES Promotion: https://github.com/elastic/kibana/issues/151756
  describe('data_streams_list', () => {
    skipIfNoDockerRegistry(providerContext);

    beforeEach(async () => {
      await installPackage(pkgName, pkgVersion);

      // Create index template that do use final pipeline
      const sourceIndexTemplate = (
        await es.indices.getIndexTemplate({
          name: logsTemplateName,
        })
      ).index_templates[0].index_template;
      await es.indices.putIndexTemplate({
        name: `${logsTemplateName}-testwithoutfinalpipeline`,
        template: sourceIndexTemplate.template,
        _meta: sourceIndexTemplate._meta,
        data_stream: sourceIndexTemplate.data_stream,
        composed_of: sourceIndexTemplate.composed_of.filter(
          (template) => template.includes('@settings') || template.includes('@package')
        ),
        index_patterns: [`${logsTemplateName}-testwithoutfinalpipeline`],
        priority: 500,
      });
    });

    afterEach(async () => {
      const pathsToDelete = [
        `/_data_stream/${logsTemplateName}-default`,
        `/_data_stream/${metricsTemplateName}-default`,
        `/_data_stream/${notFleetTemplateName}-default`,
        `/_data_stream/${logsTemplateName}-testwithoutfinalpipeline`,
      ];

      for (const path of pathsToDelete) {
        await es.transport
          .request({
            method: 'DELETE',
            path,
          })
          // Silently swallow errors here as not all tests seed data streams
          .catch((e) => {});
      }

      await es.indices.deleteIndexTemplate({
        name: `${logsTemplateName}-testwithoutfinalpipeline`,
      });
      await uninstallPackage(pkgName, pkgVersion);
    });

    it("should return no data streams when there isn't any data yet", async function () {
      const { body } = await getDataStreams();
      expect(body).to.eql({ data_streams: [] });
    });

    it('should return correct basic data stream information', async function () {
      await seedDataStreams();
      // we can't compare the array directly as the order is unpredictable
      const expectedStreamsByDataset = keyBy(
        [
          {
            dataset: 'datastreams.test_metrics',
            namespace: 'default',
            type: 'metrics',
            package: 'datastreams',
            package_version: '0.1.0',
            dashboards: [],
            serviceDetails: null,
          },
          {
            dataset: 'datastreams.test_logs',
            namespace: 'default',
            type: 'logs',
            package: 'datastreams',
            package_version: '0.1.0',
            dashboards: [],
            serviceDetails: null,
          },
        ],
        'dataset'
      );

      await retry.tryForTime(10000, async () => {
        const { body } = await getDataStreams();
        expect(body.data_streams.length).to.eql(2);

        body.data_streams.forEach((dataStream: any) => {
          // eslint-disable-next-line @typescript-eslint/naming-convention
          const { index, size_in_bytes, size_in_bytes_formatted, last_activity_ms, ...coreFields } =
            dataStream;
          expect(expectedStreamsByDataset[coreFields.dataset]).not.to.eql(undefined);
          expect(coreFields).to.eql(expectedStreamsByDataset[coreFields.dataset]);
        });
      });
    });

    it('should use event.ingested instead of @timestamp for last_activity_ms', async function () {
      const seedResponse = await seedDataStreams();
      const docs = await getSeedDocsFromResponse(seedResponse);
      const docsByDataset: Record<string, any> = keyBy(docs, '_source.data_stream.dataset');
      await retry.tryForTime(10000, async () => {
        const { body } = await getDataStreams();
        expect(body.data_streams.length).to.eql(2);
        body.data_streams.forEach((dataStream: any) => {
          expect(docsByDataset[dataStream.dataset]).not.to.eql(undefined);
          const expectedTimestamp = new Date(
            docsByDataset[dataStream.dataset]?._source?.event?.ingested
          ).getTime();
          expect(dataStream.last_activity_ms).to.eql(expectedTimestamp);
        });
      });
    });

    it('should work for datastream without event.ingested and use @timestamp for last_activity_ms', async function () {
      const timestamp = Date.now() - 1000 * 60 * 60;

      await es.index({
        index: `${logsTemplateName}-testwithoutfinalpipeline`,
        refresh: 'wait_for',

        document: {
          '@timestamp': new Date(timestamp).toISOString(),
          logs_test_name: 'test',
          data_stream: {
            dataset: `${pkgName}.test_logs`,
            namespace: 'testwithoutfinalpipeline',
            type: 'logs',
          },
        },
      });

      const res = await es.search({
        index: `${logsTemplateName}-testwithoutfinalpipeline`,
      });

      expect(res.hits.hits.length).to.eql(1);
      expect((res.hits.hits[0]._source as any).event).to.eql(undefined);

      const { body } = await getDataStreams();
      expect(body.data_streams.length).to.eql(1);

      const dataStream = body.data_streams[0];

      expect(dataStream.dataset).to.eql('datastreams.test_logs');
      expect(dataStream.last_activity_ms).to.eql(timestamp);
    });

    it('should return correct number of data streams regardless of number of backing indices', async function () {
      await seedDataStreams();
      await retry.tryForTime(10000, async () => {
        const { body } = await getDataStreams();
        return expect(body.data_streams.length).to.eql(2);
      });

      // Rollover data streams to increase # of backing indices and seed the new write index
      await es.transport.request({
        method: 'POST',
        path: `/${logsTemplateName}-default/_rollover`,
      });
      await es.transport.request({
        method: 'POST',
        path: `/${metricsTemplateName}-default/_rollover`,
      });
      await seedDataStreams();

      // Wait until backing indices are created
      await retry.tryForTime(10000, async () => {
        const { body } = await es.transport.request<any>(
          {
            method: 'GET',
            path: `/${logsTemplateName}-default,${metricsTemplateName}-default/_search`,
            body: {
              size: 0,
              aggs: {
                index: {
                  terms: {
                    field: '_index',
                    size: 100000,
                  },
                },
              },
            },
          },
          { meta: true }
        );
        expect(body.aggregations.index.buckets.length).to.eql(4);
      });

      // Check that data streams still return correctly
      const { body } = await getDataStreams();
      return expect(body.data_streams.length).to.eql(2);
    });
  });
}
