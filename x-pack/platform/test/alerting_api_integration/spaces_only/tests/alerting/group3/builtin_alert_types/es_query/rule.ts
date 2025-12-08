/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect/expect';

import { ES_TEST_INDEX_NAME } from '@kbn/alerting-api-integration-helpers';

import { ALERT_REASON, ALERT_URL } from '@kbn/rule-data-utils';
import { Spaces } from '../../../../../scenarios';
import type { FtrProviderContext } from '../../../../../../common/ftr_provider_context';
import { getUrlPrefix, ObjectRemover } from '../../../../../../common/lib';
import {
  createConnector,
  ES_GROUPS_TO_WRITE,
  ES_TEST_DATA_STREAM_NAME,
  ES_TEST_INDEX_REFERENCE,
  ES_TEST_INDEX_SOURCE,
  ES_TEST_OUTPUT_INDEX_NAME,
  getRuleServices,
  RULE_INTERVALS_TO_WRITE,
  RULE_INTERVAL_MILLIS,
  RULE_TYPE_ID,
} from './common';
import { createDataStream, deleteDataStream } from '../../../create_test_data';

export default function ruleTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const retry = getService('retry');
  const indexPatterns = getService('indexPatterns');
  const {
    es,
    esTestIndexTool,
    esTestIndexToolOutput,
    esTestIndexToolDataStream,
    createEsDocumentsInGroups,
    createGroupedEsDocumentsInGroups,
    removeAllAADDocs,
    getAllAADDocs,
  } = getRuleServices(getService);

  describe('rule', () => {
    let endDate: string;
    let connectorId: string;
    const objectRemover = new ObjectRemover(supertest);

    beforeEach(async () => {
      await esTestIndexTool.destroy();
      await esTestIndexTool.setup();

      await esTestIndexToolOutput.destroy();
      await esTestIndexToolOutput.setup();

      connectorId = await createConnector(supertest, objectRemover, ES_TEST_OUTPUT_INDEX_NAME);

      // write documents in the future, figure out the end date
      const endDateMillis = Date.now() + (RULE_INTERVALS_TO_WRITE - 1) * RULE_INTERVAL_MILLIS;
      endDate = new Date(endDateMillis).toISOString();

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

    [
      [
        'esQuery',
        async () => {
          const rule1Id = await createDSLRule({
            name: 'never fire',
            thresholdComparator: '<',
            threshold: [0],
          });
          const rule2Id = await createDSLRule({
            name: 'always fire',
            thresholdComparator: '>',
            threshold: [0],
          });
          return [rule1Id, rule2Id];
        },
      ] as const,
      [
        'searchSource',
        async () => {
          const esTestDataViewId = await createIndexPattern('date');
          const rule1Id = await createSearchSourceRule(
            {
              name: 'never fire',
              thresholdComparator: '<',
              threshold: [0],
            },
            esTestDataViewId
          );
          const rule2Id = await createSearchSourceRule(
            {
              name: 'always fire',
              thresholdComparator: '>',
              threshold: [0],
            },
            esTestDataViewId
          );
          return [rule1Id, rule2Id];
        },
      ] as const,
    ].forEach(([searchType, initData]) =>
      it(`runs correctly: threshold on ungrouped hit count < > for ${searchType} search type`, async () => {
        // this test runs the rules twice, injecting data between each run
        // the always firing rule should fire each time, triggering an index action each time
        // the never firing rule should not fire or trigger any actions

        // Run 1:
        // 1 - write source documents, dated 30 minutes in the past
        // 2 - create the rules - they run one time on creation
        // 3 - wait for output doc to be written, indicating rule is done running
        await createEsDocumentsInGroups(ES_GROUPS_TO_WRITE, getEndDate(-(30 * 60 * 1000)));
        const [neverFireRuleId, alwaysFireRuleId] = await initData();
        let docs = await waitForDocs(1);

        // Run 2:
        // 1 - write source documents, dated now
        // 2 - manually run the rules with runSoon
        // 3 - wait for output doc to be written, indicating rule is done running
        await createEsDocumentsInGroups(ES_GROUPS_TO_WRITE, new Date(Date.now()).toISOString());
        await Promise.all([runSoon(neverFireRuleId), runSoon(alwaysFireRuleId)]);

        // a total of 2 index actions should have been triggered, resulting in 2 docs in the output index
        docs = await waitForDocs(2);

        const messagePattern =
          /Document count is \d+.?\d* in the last 1h in kibana-alerting-test-data (?:index|data view). Alert when greater than 0./;

        for (let i = 0; i < docs.length; i++) {
          const doc = docs[i];
          const { previousTimestamp, hits } = doc._source;
          const { name, title, message } = doc._source.params;

          expect(name).to.be('always fire');
          expect(title).to.be(`rule 'always fire' matched query`);
          expect(message).to.match(messagePattern);
          expect(hits).not.to.be.empty();

          // during the first execution, the latestTimestamp value should be empty
          // since this rule always fires, the latestTimestamp value should be updated each execution
          if (!i) {
            expect(previousTimestamp).to.be.empty();
          } else {
            expect(previousTimestamp).not.to.be.empty();
          }
        }

        const aadDocs = await getAllAADDocs(1);

        const alertDoc = aadDocs.body.hits.hits[0]._source;
        expect(alertDoc[ALERT_REASON]).to.match(messagePattern);
        expect(alertDoc['kibana.alert.title']).to.be("rule 'always fire' matched query");
        expect(alertDoc['kibana.alert.evaluation.conditions']).to.be(
          'Number of matching documents is greater than 0'
        );
        expect(alertDoc['kibana.alert.evaluation.threshold']).to.eql(0);
        const value = parseInt(alertDoc['kibana.alert.evaluation.value'], 10);
        expect(value >= 0).to.be(true);
        expect(alertDoc[ALERT_URL]).to.contain('/s/space1/app/');
        expect(alertDoc['host.name'][0]).to.be('host-1');
        expect(alertDoc['host.hostname'][0]).to.be('host-1');
        expect(alertDoc['host.id'][0]).to.be('1');
      })
    );

    [
      [
        'esQuery',
        async () => {
          const rule1Id = await createDSLRule({
            name: 'never fire',
            thresholdComparator: '<',
            threshold: [0],
            aggType: 'avg',
            aggField: 'testedValue',
          });
          const rule2Id = await createDSLRule({
            name: 'always fire',
            thresholdComparator: '>',
            threshold: [0],
            aggType: 'avg',
            aggField: 'testedValue',
          });
          return [rule1Id, rule2Id];
        },
      ] as const,
      [
        'searchSource',
        async () => {
          const esTestDataViewId = await createIndexPattern('date');
          const rule1Id = await createSearchSourceRule(
            {
              name: 'never fire',
              thresholdComparator: '<',
              threshold: [0],
              aggType: 'avg',
              aggField: 'testedValue',
            },
            esTestDataViewId
          );
          const rule2Id = await createSearchSourceRule(
            {
              name: 'always fire',
              thresholdComparator: '>',
              threshold: [0],
              aggType: 'avg',
              aggField: 'testedValue',
            },
            esTestDataViewId
          );
          return [rule1Id, rule2Id];
        },
      ] as const,
    ].forEach(([searchType, initData]) =>
      it(`runs correctly: threshold on ungrouped agg metric < > for ${searchType} search type`, async () => {
        // this test runs the rules twice, injecting data between each run
        // the always firing rule should fire each time, triggering an index action each time
        // the never firing rule should not fire or trigger any actions

        // Run 1:
        // 1 - write source documents, dated 30 minutes in the past
        // 2 - create the rules - they run one time on creation
        // 3 - wait for output doc to be written, indicating rule is done running
        await createEsDocumentsInGroups(ES_GROUPS_TO_WRITE, getEndDate(-(30 * 60 * 1000)));
        const [neverFireRuleId, alwaysFireRuleId] = await initData();
        let docs = await waitForDocs(1);

        // Run 2:
        // 1 - write source documents, dated now
        // 2 - manually run the rules with runSoon
        // 3 - wait for output doc to be written, indicating rule is done running
        await createEsDocumentsInGroups(ES_GROUPS_TO_WRITE, new Date(Date.now()).toISOString());
        await Promise.all([runSoon(neverFireRuleId), runSoon(alwaysFireRuleId)]);

        // a total of 2 index actions should have been triggered, resulting in 2 docs in the output index
        docs = await waitForDocs(2);

        const messagePattern =
          /Document count is \d+.?\d* in the last 1h in kibana-alerting-test-data (?:index|data view). Alert when greater than 0./;

        for (let i = 0; i < docs.length; i++) {
          const doc = docs[i];
          const { previousTimestamp, hits } = doc._source;
          const { name, title, message } = doc._source.params;

          expect(name).to.be('always fire');
          expect(title).to.be(`rule 'always fire' matched query`);
          expect(message).to.match(messagePattern);
          expect(hits).not.to.be.empty();

          // during the first execution, the latestTimestamp value should be empty
          // since this rule always fires, the latestTimestamp value should be updated each execution
          if (!i) {
            expect(previousTimestamp).to.be.empty();
          } else {
            expect(previousTimestamp).not.to.be.empty();
          }
        }

        const aadDocs = await getAllAADDocs(1);

        const alertDoc = aadDocs.body.hits.hits[0]._source;
        expect(alertDoc[ALERT_REASON]).to.match(messagePattern);
        expect(alertDoc['kibana.alert.title']).to.be("rule 'always fire' matched query");
        expect(alertDoc['kibana.alert.evaluation.conditions']).to.be(
          'Number of matching documents where avg of testedValue is greater than 0'
        );
        const value = parseInt(alertDoc['kibana.alert.evaluation.value'], 10);
        expect(value >= 0).to.be(true);
        expect(alertDoc[ALERT_URL]).to.contain('/s/space1/app/');
        expect(alertDoc['host.name'][0]).to.be('host-1');
        expect(alertDoc['host.hostname'][0]).to.be('host-1');
        expect(alertDoc['host.id'][0]).to.be('1');
      })
    );

    [
      [
        'esQuery',
        async () => {
          await createDSLRule({
            name: 'never fire',
            thresholdComparator: '<',
            threshold: [0],
            groupBy: 'top',
            termField: 'group',
            termSize: ES_GROUPS_TO_WRITE,
          });
          await createDSLRule({
            name: 'always fire',
            thresholdComparator: '>',
            threshold: [0],
            groupBy: 'top',
            termField: 'group',
            termSize: ES_GROUPS_TO_WRITE,
          });
        },
      ] as const,
      [
        'searchSource',
        async () => {
          const esTestDataViewId = await createIndexPattern('date');
          await createSearchSourceRule(
            {
              name: 'never fire',
              thresholdComparator: '<',
              threshold: [0],
              groupBy: 'top',
              termField: 'group',
              termSize: ES_GROUPS_TO_WRITE,
            },
            esTestDataViewId
          );
          await createSearchSourceRule(
            {
              name: 'always fire',
              thresholdComparator: '>',
              threshold: [0],
              groupBy: 'top',
              termField: 'group',
              termSize: ES_GROUPS_TO_WRITE,
            },
            esTestDataViewId
          );
        },
      ] as const,
    ].forEach(([searchType, initData]) =>
      it(`runs correctly: threshold on grouped hit count < > for ${searchType} search type`, async () => {
        // this test runs the rules once, injecting data before the first run
        // the always firing rule should fire and trigger an index action for each group
        // the never firing rule should never fire or trigger any actions

        // Run 1:
        // 1 - write source documents, dated now
        // 2 - create the rules - they run one time on creation
        // 3 - wait for output docs to be written, indicating rule is done running
        await createGroupedEsDocumentsInGroups(ES_GROUPS_TO_WRITE, getEndDate(0));
        await initData();
        const docs = await waitForDocs(ES_GROUPS_TO_WRITE);

        const messagePattern =
          /Document count is \d+.?\d* in the last 1h for group-\d+ in kibana-alerting-test-data (?:index|data view). Alert when greater than 0./;
        const titlePattern = /rule 'always fire' matched query for group group-\d/;
        const conditionPattern =
          /Number of matching documents for group "group-\d" is greater than 0/;

        for (let i = 0; i < docs.length; i++) {
          const doc = docs[i];
          const { previousTimestamp, hits } = doc._source;
          const { name, title, message } = doc._source.params;

          expect(name).to.be('always fire');
          expect(title).to.match(titlePattern);
          expect(message).to.match(messagePattern);
          expect(hits).not.to.be.empty();

          expect(previousTimestamp).to.be.empty();
        }

        const aadDocs = await getAllAADDocs(ES_GROUPS_TO_WRITE);

        for (let i = 0; i < aadDocs.length; i++) {
          const alertDoc = aadDocs.body.hits.hits[i]._source;
          expect(alertDoc[ALERT_REASON]).to.match(messagePattern);
          expect(alertDoc['kibana.alert.title']).to.match(titlePattern);
          expect(alertDoc['kibana.alert.evaluation.conditions']).to.match(conditionPattern);
          const value = parseInt(alertDoc['kibana.alert.evaluation.value'], 10);
          expect(value).greaterThan(0);
          expect(alertDoc[ALERT_URL]).to.contain('/s/space1/app/');
          expect(alertDoc['host.name'][0]).to.be('host-1');
          expect(alertDoc['host.hostname'][0]).to.be('host-1');
          expect(alertDoc['host.id'][0]).to.be('1');
        }
      })
    );

    [
      [
        'esQuery',
        async () => {
          await createDSLRule({
            name: 'always fire',
            thresholdComparator: '>',
            threshold: [0],
            groupBy: 'top',
            termField: ['group', 'testedValue'],
            termSize: ES_GROUPS_TO_WRITE,
          });
        },
      ] as const,
      [
        'searchSource',
        async () => {
          const esTestDataViewId = await createIndexPattern('date');
          await createSearchSourceRule(
            {
              name: 'always fire',
              thresholdComparator: '>',
              threshold: [0],
              groupBy: 'top',
              termField: ['group', 'testedValue'],
              termSize: ES_GROUPS_TO_WRITE,
            },
            esTestDataViewId
          );
        },
      ] as const,
    ].forEach(([searchType, initData]) =>
      it(`runs correctly: threshold on grouped with multi term hit count < > for ${searchType} search type`, async () => {
        // this test runs the rules once, injecting data before the first run
        // the always firing rule should fire and trigger an index action for each group
        // the never firing rule should never fire or trigger any actions

        // Run 1:
        // 1 - write source documents, dated now
        // 2 - create the rules - they run one time on creation
        // 3 - wait for output docs to be written, indicating rule is done running
        await createGroupedEsDocumentsInGroups(ES_GROUPS_TO_WRITE, getEndDate(0));
        await initData();
        const docs = await waitForDocs(ES_GROUPS_TO_WRITE);

        const messagePattern =
          /Document count is \d+.?\d* in the last 1h for group-\d+,\d+ in kibana-alerting-test-data (?:index|data view). Alert when greater than 0./;
        const titlePattern = /rule 'always fire' matched query for group group-\d+,\d+/;
        const conditionPattern =
          /Number of matching documents for group "group-\d+,\d+" is greater than 0/;

        for (let i = 0; i < docs.length; i++) {
          const doc = docs[i];
          const { previousTimestamp, hits } = doc._source;
          const { name, title, message } = doc._source.params;

          expect(name).to.be('always fire');
          expect(title).to.match(titlePattern);
          expect(message).to.match(messagePattern);
          expect(hits).not.to.be.empty();

          expect(previousTimestamp).to.be.empty();
        }

        const aadDocs = await getAllAADDocs(ES_GROUPS_TO_WRITE);

        for (let i = 0; i < aadDocs.length; i++) {
          const alertDoc = aadDocs.body.hits.hits[i]._source;
          expect(alertDoc[ALERT_REASON]).to.match(messagePattern);
          expect(alertDoc['kibana.alert.title']).to.match(titlePattern);
          expect(alertDoc['kibana.alert.evaluation.conditions']).to.match(conditionPattern);
          const value = parseInt(alertDoc['kibana.alert.evaluation.value'], 10);
          expect(value).greaterThan(0);
          expect(alertDoc[ALERT_URL]).to.contain('/s/space1/app/');
          expect(alertDoc['host.name'][0]).to.be('host-1');
          expect(alertDoc['host.hostname'][0]).to.be('host-1');
          expect(alertDoc['host.id'][0]).to.be('1');
        }
      })
    );

    [
      [
        'esQuery',
        async () => {
          await createDSLRule({
            name: 'always fire',
            thresholdComparator: '>',
            threshold: [0],
            groupBy: 'top',
            termField: 'group',
            termSize: ES_GROUPS_TO_WRITE,
            aggType: 'avg',
            aggField: 'testedValue',
          });
        },
      ] as const,
      [
        'searchSource',
        async () => {
          const esTestDataViewId = await createIndexPattern('date');
          await createSearchSourceRule(
            {
              name: 'always fire',
              thresholdComparator: '>',
              threshold: [0],
              searchType: 'searchSource',
              groupBy: 'top',
              termField: 'group',
              termSize: ES_GROUPS_TO_WRITE,
              aggType: 'avg',
              aggField: 'testedValue',
            },
            esTestDataViewId
          );
        },
      ] as const,
    ].forEach(([searchType, initData]) =>
      it(`runs correctly: threshold on grouped agg metric < > for ${searchType} search type`, async () => {
        // this test runs the rules once, injecting data before the first run
        // the always firing rule should fire and trigger an index action for each group
        // the never firing rule should never fire or trigger any actions

        // Run 1:
        // 1 - write source documents, dated now
        // 2 - create the rules - they run one time on creation
        // 3 - wait for output docs to be written, indicating rule is done running
        await createGroupedEsDocumentsInGroups(ES_GROUPS_TO_WRITE, getEndDate(0));
        await initData();
        const docs = await waitForDocs(ES_GROUPS_TO_WRITE);

        for (let i = 0; i < docs.length; i++) {
          const doc = docs[i];
          const { previousTimestamp, hits } = doc._source;
          const { name, title, message } = doc._source.params;

          expect(name).to.be('always fire');
          const titlePattern = /rule 'always fire' matched query for group group-\d/;
          expect(title).to.match(titlePattern);
          const messagePattern =
            /Document count is \d+.?\d* in the last 1h for group-\d+ in kibana-alerting-test-data (?:index|data view). Alert when greater than 0./;
          expect(message).to.match(messagePattern);
          expect(hits).not.to.be.empty();

          expect(previousTimestamp).to.be.empty();
        }
      })
    );

    [
      [
        'esQuery',
        async () => {
          const rule1Id = await createDSLRule({
            name: 'never fire',
            thresholdComparator: '<',
            threshold: [0],
            timeField: 'date_epoch_millis',
          });
          const rule2Id = await createDSLRule({
            name: 'always fire',
            thresholdComparator: '>',
            threshold: [0],
            timeField: 'date_epoch_millis',
          });
          return [rule1Id, rule2Id];
        },
      ] as const,
      [
        'searchSource',
        async () => {
          const esTestDataViewId = await createIndexPattern('date_epoch_millis');
          const rule1Id = await createSearchSourceRule(
            {
              name: 'never fire',
              thresholdComparator: '<',
              threshold: [0],
            },
            esTestDataViewId
          );
          const rule2Id = await createSearchSourceRule(
            {
              name: 'always fire',
              thresholdComparator: '>',
              threshold: [0],
            },
            esTestDataViewId
          );
          return [rule1Id, rule2Id];
        },
      ] as const,
    ].forEach(([searchType, initData]) =>
      it(`runs correctly: use epoch millis - threshold on hit count < > for ${searchType} search type`, async () => {
        // this test runs the rules twice, injecting data between each run
        // the always firing rule should fire each time, triggering an index action each time
        // the never firing rule should not fire or trigger any actions

        // Run 1:
        // 1 - write source documents, dated 30 minutes in the past
        // 2 - create the rules - they run one time on creation
        // 3 - wait for output doc to be written, indicating rule is done running
        await createEsDocumentsInGroups(ES_GROUPS_TO_WRITE, getEndDate(-(30 * 60 * 1000)));
        const [neverFireRuleId, alwaysFireRuleId] = await initData();
        let docs = await waitForDocs(1);

        // Run 2:
        // 1 - write source documents, dated now
        // 2 - manually run the rules with runSoon
        // 3 - wait for output doc to be written, indicating rule is done running
        await createEsDocumentsInGroups(ES_GROUPS_TO_WRITE, new Date(Date.now()).toISOString());
        await Promise.all([runSoon(neverFireRuleId), runSoon(alwaysFireRuleId)]);

        // a total of 2 index actions should have been triggered, resulting in 2 docs in the output index
        docs = await waitForDocs(2);

        for (let i = 0; i < docs.length; i++) {
          const doc = docs[i];
          const { previousTimestamp, hits } = doc._source;
          const { name, title, message } = doc._source.params;

          expect(name).to.be('always fire');
          expect(title).to.be(`rule 'always fire' matched query`);
          const messagePattern =
            /Document count is \d+.?\d* in the last 1h in kibana-alerting-test-data (?:index|data view). ./;
          expect(message).to.match(messagePattern);
          expect(hits).not.to.be.empty();

          // during the first execution, the latestTimestamp value should be empty
          // since this rule always fires, the latestTimestamp value should be updated each execution
          if (i === 0) {
            expect(previousTimestamp).to.be.empty();
          } else {
            expect(previousTimestamp).not.to.be.empty();
          }
        }
      })
    );

    [
      [
        'esQuery',
        async () => {
          const rangeQuery = (rangeThreshold: number) => {
            return {
              query: {
                bool: {
                  filter: [
                    {
                      range: {
                        testedValue: {
                          gte: rangeThreshold,
                        },
                      },
                    },
                  ],
                },
              },
            };
          };
          await createDSLRule({
            name: 'never fire',
            esQuery: JSON.stringify(rangeQuery(ES_GROUPS_TO_WRITE * RULE_INTERVALS_TO_WRITE + 1)),
            thresholdComparator: '<',
            threshold: [0],
          });
          await createDSLRule({
            name: 'fires once',
            esQuery: JSON.stringify(
              rangeQuery(Math.floor((ES_GROUPS_TO_WRITE * RULE_INTERVALS_TO_WRITE) / 2))
            ),
            thresholdComparator: '>=',
            threshold: [0],
          });
        },
      ] as const,
      [
        'searchSource',
        async () => {
          const esTestDataViewId = await createIndexPattern('date');
          await createSearchSourceRule(
            {
              name: 'never fire',
              thresholdComparator: '<',
              threshold: [0],
            },
            esTestDataViewId,
            `testedValue > ${ES_GROUPS_TO_WRITE * RULE_INTERVALS_TO_WRITE + 1}`
          );
          await createSearchSourceRule(
            {
              name: 'fires once',
              thresholdComparator: '>=',
              threshold: [0],
            },
            esTestDataViewId,
            `testedValue > ${Math.floor((ES_GROUPS_TO_WRITE * RULE_INTERVALS_TO_WRITE) / 2)}`
          );
        },
      ] as const,
    ].forEach(([searchType, initData]) =>
      it(`runs correctly with query: threshold on hit count < > for ${searchType}`, async () => {
        // this test runs the rules once, injecting data before the first run
        // the fires once rule should fire and trigger an index action for each group
        // the never firing rule should never fire or trigger any actions

        // Run 1:
        // 1 - write source documents, dated now
        // 2 - create the rules - they run one time on creation
        // 3 - wait for output docs to be written, indicating rule is done running
        await createEsDocumentsInGroups(ES_GROUPS_TO_WRITE, getEndDate(0));
        await initData();
        const docs = await waitForDocs(1);

        for (const doc of docs) {
          const { previousTimestamp, hits } = doc._source;
          const { name, title, message } = doc._source.params;

          expect(name).to.be('fires once');
          expect(title).to.be(`rule 'fires once' matched query`);
          const messagePattern =
            /Document count is \d+.?\d* in the last 1h in kibana-alerting-test-data (?:index|data view). Alert when greater than or equal to 0./;
          expect(message).to.match(messagePattern);
          expect(hits).not.to.be.empty();
          expect(previousTimestamp).to.be.empty();
        }
      })
    );

    [
      [
        'esQuery',
        async () => {
          await createDSLRule({
            name: 'always fire',
            thresholdComparator: '<',
            threshold: [1],
          });
        },
      ] as const,
      [
        'searchSource',
        async () => {
          const esTestDataViewId = await createIndexPattern('date');
          await createSearchSourceRule(
            {
              name: 'always fire',
              thresholdComparator: '<',
              threshold: [1],
            },
            esTestDataViewId
          );
        },
      ] as const,
    ].forEach(([searchType, initData]) =>
      it(`runs correctly: no matches for ${searchType} search type`, async () => {
        // purposely skip creating ES documents so the index is empty
        await initData();
        const docs = await waitForDocs(1);

        for (let i = 0; i < docs.length; i++) {
          const doc = docs[i];
          const { previousTimestamp, hits } = doc._source;
          const { name, title, message } = doc._source.params;

          expect(name).to.be('always fire');
          expect(title).to.be(`rule 'always fire' matched query`);
          const messagePattern =
            /Document count is \d+.?\d* in the last 1h in kibana-alerting-test-data (?:index|data view). Alert when less than 1./;
          expect(message).to.match(messagePattern);
          expect(hits).to.be.empty();

          // during the first execution, the latestTimestamp value should be empty
          // since this rule always fires, the latestTimestamp value should be updated each execution
          if (!i) {
            expect(previousTimestamp).to.be.empty();
          } else {
            expect(previousTimestamp).not.to.be.empty();
          }
        }
      })
    );

    [
      [
        'esQuery',
        async () => {
          // This rule should be active initially when the number of documents is below the threshold
          // and then recover when we add more documents.
          return await createDSLRule({
            name: 'fire then recovers',
            thresholdComparator: '<',
            threshold: [1],
            notifyWhen: 'onActionGroupChange',
          });
        },
      ] as const,
      [
        'searchSource',
        async () => {
          const esTestDataViewId = await createIndexPattern('date');
          // This rule should be active initially when the number of documents is below the threshold
          // and then recover when we add more documents.
          return await createSearchSourceRule(
            {
              name: 'fire then recovers',
              thresholdComparator: '<',
              threshold: [1],
              notifyWhen: 'onActionGroupChange',
            },
            esTestDataViewId
          );
        },
      ] as const,
    ].forEach(([searchType, initData]) =>
      it(`runs correctly and populates recovery context for ${searchType} search type`, async () => {
        // this test runs the rules twice, injecting data after the first run
        // the rule should fire the first run when there is no data in the index and
        // then recover the second run after data is injected

        // Run 1:
        // 1 - skip writing source documents
        // 2 - create the rules - they run one time on creation
        // 3 - wait for output doc to be written, indicating rule is done running
        const ruleId = await initData();
        let docs = await waitForDocs(1);

        const activeDoc = docs[0];
        const {
          name: activeName,
          title: activeTitle,
          value: activeValue,
          message: activeMessage,
        } = activeDoc._source.params;

        expect(activeName).to.be('fire then recovers');
        expect(activeTitle).to.be(`rule 'fire then recovers' matched query`);
        expect(activeValue).to.be('0');
        expect(activeMessage).to.match(
          /Document count is \d+.?\d* in the last 1h in kibana-alerting-test-data (?:index|data view). Alert when less than 1./
        );

        // Run 2:
        // 1 - write source documents, dated now
        // 2 - manually run the rule with runSoon
        // 3 - wait for output doc to be written, indicating rule is done running
        await createEsDocumentsInGroups(1, endDate);
        await runSoon(ruleId);
        docs = await waitForDocs(2);

        const recoveredDoc = docs[1];
        const {
          name: recoveredName,
          title: recoveredTitle,
          message: recoveredMessage,
        } = recoveredDoc._source.params;

        expect(recoveredName).to.be('fire then recovers');
        expect(recoveredTitle).to.be(`rule 'fire then recovers' recovered`);
        expect(recoveredMessage).to.match(
          /Document count is \d+.?\d* in the last 1h in kibana-alerting-test-data (?:index|data view). Alert when less than 1./
        );
      })
    );

    [
      [
        'esQuery',
        async () => {
          const rule1Id = await createDSLRule({
            name: 'never fire',
            thresholdComparator: '<',
            threshold: [0],
            indexName: ES_TEST_DATA_STREAM_NAME,
            timeField: '@timestamp',
          });
          const rule2Id = await createDSLRule({
            name: 'always fire',
            thresholdComparator: '>',
            threshold: [0],
            indexName: ES_TEST_DATA_STREAM_NAME,
            timeField: '@timestamp',
          });
          return [rule1Id, rule2Id];
        },
      ] as const,
      [
        'searchSource',
        async () => {
          const esTestDataViewId = await createIndexPattern('date', ES_TEST_DATA_STREAM_NAME);
          const rule1Id = await createSearchSourceRule(
            {
              name: 'never fire',
              thresholdComparator: '<',
              threshold: [0],
            },
            esTestDataViewId
          );
          const rule2Id = await createSearchSourceRule(
            {
              name: 'always fire',
              thresholdComparator: '>',
              threshold: [0],
            },
            esTestDataViewId
          );
          return [rule1Id, rule2Id];
        },
      ] as const,
    ].forEach(([searchType, initData]) =>
      it(`runs correctly over a data stream: threshold on ungrouped hit count < > for ${searchType} search type`, async () => {
        // This runs the same test as above but specifically targets a data stream index

        // this test runs the rules twice, injecting data between each run
        // the always firing rule should fire each time, triggering an index action each time
        // the never firing rule should not fire or trigger any actions

        // Run 1:
        // 1 - write source documents, dated 30 minutes in the past
        // 2 - create the rules - they run one time on creation
        // 3 - wait for output doc to be written, indicating rule is done running
        await createEsDocumentsInGroups(
          ES_GROUPS_TO_WRITE,
          getEndDate(-(30 * 60 * 1000)),
          esTestIndexToolDataStream,
          ES_TEST_DATA_STREAM_NAME
        );
        const [neverFireRuleId, alwaysFireRuleId] = await initData();
        let docs = await waitForDocs(1);

        // Run 2:
        // 1 - write source documents, dated now
        // 2 - manually run the rules with runSoon
        // 3 - wait for output doc to be written, indicating rule is done running
        await createEsDocumentsInGroups(
          ES_GROUPS_TO_WRITE,
          new Date(Date.now()).toISOString(),
          esTestIndexToolDataStream,
          ES_TEST_DATA_STREAM_NAME
        );
        await Promise.all([runSoon(neverFireRuleId), runSoon(alwaysFireRuleId)]);

        // a total of 2 index actions should have been triggered, resulting in 2 docs in the output index
        docs = await waitForDocs(2);

        const messagePattern =
          /Document count is \d+.?\d* in the last 1h in test-data-stream (?:index|data view). Alert when greater than 0./;

        for (let i = 0; i < docs.length; i++) {
          const doc = docs[i];
          const { previousTimestamp, hits } = doc._source;
          const { name, title, message } = doc._source.params;

          expect(name).to.be('always fire');
          expect(title).to.be(`rule 'always fire' matched query`);
          expect(message).to.match(messagePattern);
          expect(hits).not.to.be.empty();

          // during the first execution, the latestTimestamp value should be empty
          // since this rule always fires, the latestTimestamp value should be updated each execution
          if (!i) {
            expect(previousTimestamp).to.be.empty();
          } else {
            expect(previousTimestamp).not.to.be.empty();
          }
        }

        const aadDocs = await getAllAADDocs(1);

        const alertDoc = aadDocs.body.hits.hits[0]._source;
        expect(alertDoc[ALERT_REASON]).to.match(messagePattern);
        expect(alertDoc['kibana.alert.title']).to.be("rule 'always fire' matched query");
        expect(alertDoc['kibana.alert.evaluation.conditions']).to.be(
          'Number of matching documents is greater than 0'
        );
        const value = parseInt(alertDoc['kibana.alert.evaluation.value'], 10);
        expect(value).greaterThan(0);
        expect(alertDoc[ALERT_URL]).to.contain('/s/space1/app/');
        expect(alertDoc['host.name'][0]).to.be('host-1');
        expect(alertDoc['host.hostname'][0]).to.be('host-1');
        expect(alertDoc['host.id'][0]).to.be('1');
      })
    );

    describe('excludeHitsFromPreviousRun', () => {
      it('excludes hits from the previous rule run when excludeHitsFromPreviousRun is true', async () => {
        // this test runs the rules twice, injecting data before the first run
        // the rule should fire the first run with all the documents and then exclude those hits
        // on the second run

        // Run 1:
        // 1 - write source documents, dated now
        // 2 - create the rule - it runs one time on creation
        // 3 - wait for output doc to be written, indicating rule is done running
        await createEsDocumentsInGroups(ES_GROUPS_TO_WRITE, new Date(Date.now()).toISOString());
        const ruleId = await createDSLRule({
          name: 'always fire',
          thresholdComparator: '>',
          threshold: [0],
          excludeHitsFromPreviousRun: true,
        });
        let docs = await waitForDocs(1);

        // Run 2:
        // 1 - don't run any more source docs
        // 2 - manually run the rules with runSoon
        // 3 - wait for output doc to be written, indicating rule is done running
        await runSoon(ruleId);
        docs = await waitForDocs(2);

        const messagePattern =
          /Document count is \d+.?\d* in the last 1h in kibana-alerting-test-data (?:index|data view). Alert when greater than 0./;
        expect(docs[0]._source.hits.length).greaterThan(0);
        expect(docs[0]._source.params.message).to.match(messagePattern);

        expect(docs[1]._source.hits.length).to.be(0);
        expect(docs[1]._source.params.message).to.match(messagePattern);
      });

      it('excludes hits from the previous rule run when excludeHitsFromPreviousRun is undefined', async () => {
        // this test runs the rules twice, injecting data before the first run
        // the rule should fire the first run with all the documents and then exclude those hits
        // on the second run

        // Run 1:
        // 1 - write source documents, dated now
        // 2 - create the rule - it runs one time on creation
        // 3 - wait for output doc to be written, indicating rule is done running
        await createEsDocumentsInGroups(ES_GROUPS_TO_WRITE, new Date(Date.now()).toISOString());
        const ruleId = await createDSLRule({
          name: 'always fire',
          thresholdComparator: '>',
          threshold: [0],
        });
        let docs = await waitForDocs(1);

        // Run 2:
        // 1 - don't run any more source docs
        // 2 - manually run the rules with runSoon
        // 3 - wait for output doc to be written, indicating rule is done running
        await runSoon(ruleId);
        docs = await waitForDocs(2);

        const messagePattern =
          /Document count is \d+.?\d* in the last 1h in kibana-alerting-test-data (?:index|data view). Alert when greater than 0./;
        expect(docs[0]._source.hits.length).greaterThan(0);
        expect(docs[0]._source.params.message).to.match(messagePattern);

        expect(docs[1]._source.hits.length).to.be(0);
        expect(docs[1]._source.params.message).to.match(messagePattern);
      });

      it('does not exclude hits from the previous rule run when excludeHitsFromPreviousRun is false', async () => {
        // this test runs the rules twice, injecting data before the first run
        // the rule should fire the first run with all the documents and then exclude those hits
        // on the second run

        // Run 1:
        // 1 - write source documents, dated now
        // 2 - create the rule - it runs one time on creation
        // 3 - wait for output doc to be written, indicating rule is done running
        await createEsDocumentsInGroups(ES_GROUPS_TO_WRITE, new Date(Date.now()).toISOString());
        const ruleId = await createDSLRule({
          name: 'always fire',
          thresholdComparator: '>',
          threshold: [0],
          excludeHitsFromPreviousRun: false,
        });
        let docs = await waitForDocs(1);

        // Run 2:
        // 1 - don't run any more source docs
        // 2 - manually run the rules with runSoon
        // 3 - wait for output doc to be written, indicating rule is done running
        await runSoon(ruleId);
        docs = await waitForDocs(2);

        const messagePattern =
          /Document count is \d+.?\d* in the last 1h in kibana-alerting-test-data (?:index|data view). Alert when greater than 0./;
        expect(docs[0]._source.hits.length).greaterThan(0);
        expect(docs[0]._source.params.message).to.match(messagePattern);

        expect(docs[1]._source.hits.length).greaterThan(0);
        expect(docs[1]._source.params.message).to.match(messagePattern);
      });
    });

    describe('aggType and groupBy', () => {
      it('sets aggType: "count" and groupBy: "all" when they are undefined', async () => {
        await createEsDocumentsInGroups(ES_GROUPS_TO_WRITE, new Date(Date.now()).toISOString());
        await createDSLRule({
          name: 'always fire',
          thresholdComparator: '>',
          threshold: [0],
          aggType: undefined,
          groupBy: undefined,
        });

        const docs = await waitForDocs(1);

        expect(docs[0]._source.hits.length).greaterThan(0);
        const messagePattern =
          /Document count is \d+.?\d* in the last 1h in kibana-alerting-test-data (?:index|data view). Alert when greater than 0./;
        expect(docs[0]._source.params.message).to.match(messagePattern);
      });
    });

    async function waitForDocs(count: number): Promise<any[]> {
      return await esTestIndexToolOutput.waitForDocs(
        ES_TEST_INDEX_SOURCE,
        ES_TEST_INDEX_REFERENCE,
        count
      );
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

    async function deleteDocs() {
      await es.deleteByQuery({
        index: ES_TEST_INDEX_NAME,
        query: { match_all: {} },
        conflicts: 'proceed',
      });
    }

    function getEndDate(millisOffset: number) {
      const endDateMillis = Date.now() + millisOffset;
      return new Date(endDateMillis).toISOString();
    }

    interface CreateRuleParams {
      name: string;
      thresholdComparator: string;
      threshold: number[];
      timeWindowSize?: number;
      esQuery?: string;
      timeField?: string;
      searchConfiguration?: unknown;
      searchType?: 'searchSource';
      notifyWhen?: string;
      indexName?: string;
      excludeHitsFromPreviousRun?: boolean;
      aggType?: string;
      aggField?: string;
      groupBy?: string;
      termField?: string | string[];
      termSize?: number;
    }

    async function createRule(
      params: CreateRuleParams,
      ruleParams: Partial<CreateRuleParams>
    ): Promise<string> {
      const action = {
        id: connectorId,
        group: 'query matched',
        params: {
          documents: [
            {
              source: ES_TEST_INDEX_SOURCE,
              reference: ES_TEST_INDEX_REFERENCE,
              params: {
                name: '{{{rule.name}}}',
                value: '{{{context.value}}}',
                title: '{{{context.title}}}',
                message: '{{{context.message}}}',
              },
              hits: '{{context.hits}}',
              date: '{{{context.date}}}',
              previousTimestamp: '{{{state.latestTimestamp}}}',
            },
          ],
        },
      };

      const recoveryAction = {
        id: connectorId,
        group: 'recovered',
        params: {
          documents: [
            {
              source: ES_TEST_INDEX_SOURCE,
              reference: ES_TEST_INDEX_REFERENCE,
              params: {
                name: '{{{rule.name}}}',
                value: '{{{context.value}}}',
                title: '{{{context.title}}}',
                message: '{{{context.message}}}',
              },
              hits: '{{context.hits}}',
              date: '{{{context.date}}}',
            },
          ],
        },
      };

      const { body: createdRule } = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .send({
          name: params.name,
          consumer: 'alerts',
          enabled: true,
          rule_type_id: RULE_TYPE_ID,
          schedule: { interval: '1d' },
          actions: [action, recoveryAction],
          notify_when: params.notifyWhen || 'onActiveAlert',
          params: {
            size: 100,
            timeWindowSize: 1,
            timeWindowUnit: 'h',
            thresholdComparator: params.thresholdComparator,
            threshold: params.threshold,
            searchType: params.searchType,
            aggType: params.aggType,
            groupBy: params.groupBy,
            aggField: params.aggField,
            termField: params.termField,
            termSize: params.termSize,
            sourceFields: [],
            ...(params.excludeHitsFromPreviousRun !== undefined && {
              excludeHitsFromPreviousRun: params.excludeHitsFromPreviousRun,
            }),
            ...ruleParams,
          },
        })
        .expect(200);

      const ruleId = createdRule.id;
      objectRemover.add(Spaces.space1.id, ruleId, 'rule', 'alerting');

      return ruleId;
    }

    async function createDSLRule(params: CreateRuleParams): Promise<string> {
      const esQuery = params.esQuery ?? `{\n  \"query\":{\n    \"match_all\" : {}\n  }\n}`;
      const ruleParams = {
        index: [params.indexName || ES_TEST_INDEX_NAME],
        timeField: params.timeField || 'date',
        esQuery,
      };

      return await createRule(params, ruleParams);
    }

    async function createSearchSourceRule(
      params: CreateRuleParams,
      dataViewId?: string,
      query: string = ''
    ): Promise<string> {
      const ruleParams = {
        searchConfiguration: {
          query: {
            query,
            language: 'kuery',
          },
          index: dataViewId,
          filter: [],
        },
      };

      return await createRule({ ...params, searchType: 'searchSource' }, ruleParams);
    }

    async function createIndexPattern(timeFieldName: string, title: string = ES_TEST_INDEX_NAME) {
      const esTestDataView = await indexPatterns.create(
        { title, timeFieldName },
        { override: true },
        getUrlPrefix(Spaces.space1.id)
      );
      return esTestDataView.id;
    }
  });
}
