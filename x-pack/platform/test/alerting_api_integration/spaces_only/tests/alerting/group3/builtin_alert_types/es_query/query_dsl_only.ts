/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { ES_TEST_INDEX_NAME } from '@kbn/alerting-api-integration-helpers';
import { pull } from 'lodash';
import { v4 as uuidv4 } from 'uuid';
import { Spaces } from '../../../../../scenarios';

import type { FtrProviderContext } from '../../../../../../common/ftr_provider_context';
import { getUrlPrefix, ObjectRemover } from '../../../../../../common/lib';
import { createDataStream, deleteDataStream } from '../../../create_test_data';
import {
  createConnector,
  ES_GROUPS_TO_WRITE,
  ES_TEST_DATA_STREAM_NAME,
  ES_TEST_OUTPUT_INDEX_NAME,
  getRuleServices,
  createDSLRule,
} from './common';

const TEST_HOSTNAME = 'test.alerting.example.com';

export default function ruleTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const retry = getService('retry');
  const {
    es,
    esTestIndexTool,
    esTestIndexToolOutput,
    createEsDocumentsInGroups,
    waitForDocs,
    getAADDocsForRule,
    removeAllAADDocs,
    deleteDocs,
    getEndDate,
  } = getRuleServices(getService);

  describe('Query DSL only', () => {
    let connectorId: string;
    const objectRemover = new ObjectRemover(supertest);

    before(async () => {
      await removeAllAADDocs();
    });

    beforeEach(async () => {
      await esTestIndexTool.destroy();
      await esTestIndexTool.setup();

      await esTestIndexToolOutput.destroy();
      await esTestIndexToolOutput.setup();

      connectorId = await createConnector(supertest, objectRemover, ES_TEST_OUTPUT_INDEX_NAME);
      await createDataStream(es, ES_TEST_DATA_STREAM_NAME);
    });

    afterEach(async () => {
      await deleteDocs();
      await objectRemover.removeAll();
      await esTestIndexTool.destroy();
      await esTestIndexToolOutput.destroy();
      await deleteDataStream(es, ES_TEST_DATA_STREAM_NAME);
      await removeAllAADDocs();
    });

    it(`runs correctly: runtime fields for esQuery search type`, async () => {
      // this test runs the rules twice, injecting data between each run
      // the rule should fire each time, triggering an index action each time

      // Run 1:
      // 1 - write source documents
      // 2 - create the rules - they run one time on creation
      // 3 - wait for output doc to be written, indicating rule is done running
      await createEsDocumentsInGroups(ES_GROUPS_TO_WRITE, getEndDate());
      const ruleId = await createDSLRule(supertest, objectRemover, connectorId, {
        name: 'always fire',
        esQuery: `
          {
            "runtime_mappings": {
                "testedValueSquared": {
                    "type": "long",
                    "script": {
                        "source": "emit(doc['testedValue'].value * doc['testedValue'].value);"
                    }
                },
                "evenOrOdd": {
                    "type": "keyword",
                    "script": {
                        "source": "emit(doc['testedValue'].value % 2 == 0 ? 'even' : 'odd');"
                    }
                }
            },
            "fields": ["testedValueSquared", "evenOrOdd"],
            "query": {
                "match_all": { }
            }
        }`.replace(`"`, `\"`),
        thresholdComparator: '>',
        threshold: [0],
        wrapInBrackets: true,
      });
      let docs = await waitForDocs(1);

      // Run 2:
      // 1 - write source documents, dated now
      // 2 - manually run the rules with runSoon
      // 3 - wait for output doc to be written, indicating rule is done running
      await createEsDocumentsInGroups(ES_GROUPS_TO_WRITE, getEndDate());
      await runSoon(ruleId);

      // a total of 2 index actions should have been triggered, resulting in 2 docs in the output index
      docs = await waitForDocs(2);

      for (let i = 0; i < docs.length; i++) {
        const doc = docs[i];
        const { name, title } = doc._source.params;
        expect(name).to.be('always fire');
        expect(title).to.be(`rule 'always fire' matched query`);

        const hits = JSON.parse(doc._source.hits);
        expect(hits).not.to.be.empty();
        hits.forEach((hit: any) => {
          expect(hit.fields).not.to.be.empty();
          expect(hit.fields.testedValueSquared).not.to.be.empty();
          // fields returns as an array of values
          hit.fields.testedValueSquared.forEach((testedValueSquared: number) => {
            expect(hit._source.testedValue * hit._source.testedValue).to.be(testedValueSquared);
          });
          hit.fields.evenOrOdd.forEach((evenOrOdd: string) => {
            expect(hit._source.testedValue % 2 === 0 ? 'even' : 'odd').to.be(evenOrOdd);
          });
        });
      }
    });

    it(`runs correctly: fetches wildcard fields in esQuery search type`, async () => {
      // this test runs the rule once, injecting data before the run
      // the rule should fire each time, triggering an index action each time

      // Run 1:
      // 1 - write source documents
      // 2 - create the rules - they run one time on creation
      // 3 - wait for output doc to be written, indicating rule is done running
      await createEsDocumentsInGroups(ES_GROUPS_TO_WRITE, getEndDate());
      await createDSLRule(supertest, objectRemover, connectorId, {
        name: 'always fire',
        esQuery: `
          {
            "fields": ["*"],
            "query": {
                "match_all": { }
            }
        }`.replace(`"`, `\"`),
        thresholdComparator: '>',
        threshold: [0],
        wrapInBrackets: true,
      });

      const docs = await waitForDocs(1);
      const doc = docs[0];
      const { name, title } = doc._source.params;
      expect(name).to.be('always fire');
      expect(title).to.be(`rule 'always fire' matched query`);

      const hits = JSON.parse(doc._source.hits);
      expect(hits).not.to.be.empty();
      hits.forEach((hit: any) => {
        expect(hit.fields).not.to.be.empty();
        expect(
          pull(
            // remove nested fields
            Object.keys(hit.fields),
            'host.hostname',
            'host.hostname.keyword',
            'host.id',
            'host.name'
          ).sort()
        ).to.eql(Object.keys(hit._source).sort());
      });
    });

    it(`runs correctly: fetches field formatting in esQuery search type`, async () => {
      // this test runs the rule once, injecting data before the run
      // the rule should fire each time, triggering an index action each time

      // Run 1:
      // 1 - write source documents
      // 2 - create the rules - they run one time on creation
      // 3 - wait for output doc to be written, indicating rule is done running
      const reIsNumeric = /^\d+$/;
      await createEsDocumentsInGroups(ES_GROUPS_TO_WRITE, getEndDate());
      await createDSLRule(supertest, objectRemover, connectorId, {
        name: 'always fire',
        esQuery: `
          {
            "fields": [
              {
                "field": "@timestamp",
                "format": "epoch_millis"
              }
            ],
            "query": {
                "match_all": { }
            }
        }`.replace(`"`, `\"`),
        thresholdComparator: '>',
        threshold: [0],
        wrapInBrackets: true,
      });

      const docs = await waitForDocs(1);
      const doc = docs[0];
      const { name, title } = doc._source.params;
      expect(name).to.be('always fire');
      expect(title).to.be(`rule 'always fire' matched query`);

      const hits = JSON.parse(doc._source.hits);
      expect(hits).not.to.be.empty();

      hits.forEach((hit: any) => {
        expect(hit.fields).not.to.be.empty();
        hit.fields['@timestamp'].forEach((timestamp: string) => {
          expect(reIsNumeric.test(timestamp)).to.be(true);
        });
      });
    });

    it(`runs correctly: _source: false field for esQuery search type`, async () => {
      // this test runs the rule once, injecting data before the run
      // the rule should fire each time, triggering an index action each time

      // Run 1:
      // 1 - write source documents
      // 2 - create the rules - they run one time on creation
      // 3 - wait for output doc to be written, indicating rule is done running
      await createEsDocumentsInGroups(ES_GROUPS_TO_WRITE, getEndDate());
      await createDSLRule(supertest, objectRemover, connectorId, {
        name: 'always fire',
        esQuery: `
          {
            "query": {
                "match_all": { }
            },
            "_source": false
        }`.replace(`"`, `\"`),
        thresholdComparator: '>',
        threshold: [0],
        wrapInBrackets: true,
      });

      const docs = await waitForDocs(1);
      const doc = docs[0];
      const { name, title } = doc._source.params;
      expect(name).to.be('always fire');
      expect(title).to.be(`rule 'always fire' matched query`);

      const hits = JSON.parse(doc._source.hits);
      expect(hits).not.to.be.empty();
      hits.forEach((hit: any) => {
        expect(hit._source).to.be(undefined);
      });
    });

    it(`runs correctly: _source field for esQuery search type`, async () => {
      // this test runs the rule once, injecting data before the run
      // the rule should fire each time, triggering an index action each time

      // Run 1:
      // 1 - write source documents
      // 2 - create the rules - they run one time on creation
      // 3 - wait for output doc to be written, indicating rule is done running
      await createEsDocumentsInGroups(ES_GROUPS_TO_WRITE, getEndDate());
      await createDSLRule(supertest, objectRemover, connectorId, {
        name: 'always fire',
        esQuery: `
          {
            "query": {
                "match_all": { }
            },
            "_source": "testedValue*"
        }`.replace(`"`, `\"`),
        thresholdComparator: '>',
        threshold: [0],
        wrapInBrackets: true,
      });

      const docs = await waitForDocs(1);
      const doc = docs[0];
      const { name, title } = doc._source.params;
      expect(name).to.be('always fire');
      expect(title).to.be(`rule 'always fire' matched query`);

      const hits = JSON.parse(doc._source.hits);
      expect(hits).not.to.be.empty();
      hits.forEach((hit: any) => {
        expect(hit._source).not.to.be.empty();
        Object.keys(hit._source).forEach((key) => {
          expect(key.startsWith('testedValue')).to.be(true);
        });
      });
    });

    it(`runs correctly: copies fields from groups into alerts`, async () => {
      // this test runs the rule once, injecting data before the run
      // the rule should fire each time, triggering an index action each time

      // Run 1:
      // 1 - write source documents
      // 2 - create the rules - they run one time on creation
      // 3 - wait for output doc to be written, indicating rule is done running
      const tag = 'example-tag-A';
      const ruleName = 'group by tag';
      await createDocWithTags([tag]);

      const ruleId = await createDSLRule(supertest, objectRemover, connectorId, {
        name: ruleName,
        esQuery: JSON.stringify({ query: { match_all: {} } }),
        timeField: '@timestamp',
        size: 100,
        thresholdComparator: '>',
        threshold: [0],
        groupBy: 'top',
        termField: 'tags',
        termSize: 3,
        sourceFields: [{ label: 'host.hostname', searchPath: 'host.hostname.keyword' }],
        wrapInBrackets: true,
      });

      const aadDocs = await getAADDocsForRule(ruleId, 1);
      const alert = aadDocs.body.hits.hits[0]._source || {};
      expect(alert['kibana.alert.rule.name']).to.be(ruleName);
      expect(alert['kibana.alert.evaluation.value']).to.be('1');

      // eslint-disable-next-line dot-notation
      const tags = alert['tags'];
      expect(Array.isArray(tags)).to.be(true);
      expect(tags.length).to.be(1);
      expect(tags[0]).to.be(tag);

      const hostname = alert['host.hostname'];
      expect(Array.isArray(hostname)).to.be(true);
      expect(hostname.length).to.be(1);
      expect(hostname[0]).to.be(TEST_HOSTNAME);
    });

    async function createDocWithTags(tags: string[]) {
      const document = {
        '@timestamp': new Date().toISOString(),
        tags,
        host: {
          hostname: TEST_HOSTNAME,
        },
      };

      const response = await es.index({
        id: uuidv4(),
        index: ES_TEST_INDEX_NAME,
        refresh: 'wait_for',
        op_type: 'create',
        body: document,
      });

      if (response.result !== 'created') {
        throw new Error(`document not created: ${JSON.stringify(response)}`);
      }
    }

    async function runSoon(ruleId: string) {
      await retry.try(async () => {
        // Sometimes the rule may already be running, which returns a 200. Try until it isn't
        const runSoonResponse = await supertest
          .post(`${getUrlPrefix(Spaces.space1.id)}/internal/alerting/rule/${ruleId}/_run_soon`)
          .set('kbn-xsrf', 'foo');
        expect(runSoonResponse.status).to.eql(204);
      });
    }
  });
}
