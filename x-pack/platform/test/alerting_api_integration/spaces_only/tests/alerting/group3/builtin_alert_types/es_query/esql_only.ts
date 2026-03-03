/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { ALERT_REASON, ALERT_URL, ALERT_INSTANCE_ID } from '@kbn/rule-data-utils';
import { Spaces } from '../../../../../scenarios';
import type { FtrProviderContext } from '../../../../../../common/ftr_provider_context';
import { getUrlPrefix, ObjectRemover } from '../../../../../../common/lib';
import {
  createConnector,
  createESQLRule,
  ES_GROUPS_TO_WRITE,
  ES_TEST_DATA_STREAM_NAME,
  ES_TEST_INDEX_REFERENCE,
  ES_TEST_INDEX_SOURCE,
  ES_TEST_OUTPUT_INDEX_NAME,
  getRuleServices,
  RULE_INTERVAL_SECONDS,
  RULE_TYPE_ID,
} from './common';
import { createDataStream, deleteDataStream } from '../../../create_test_data';

export default function ruleTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const retry = getService('retry');
  const {
    es,
    esTestIndexTool,
    esTestIndexToolOutput,
    esTestIndexToolDataStream,
    createEsDocumentsInGroups,
    createGroupedEsDocumentsInGroups,
    removeAllAADDocs,
    getAADDocsForRule,
    deleteDocs,
    getEndDate,
  } = getRuleServices(getService);

  describe('rule', () => {
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

    it('runs correctly: alerts as expected', async () => {
      // this test runs the rules twice, injecting data between each run
      // the always firing rule should fire each time, triggering an index action each time
      // the never firing rule should not fire or trigger any actions

      // Run 1:
      // 1 - write source documents
      // 2 - create the rules - they run one time on creation
      // 3 - wait for output doc to be written, indicating rule is done running
      await createGroupedEsDocumentsInGroups(ES_GROUPS_TO_WRITE, getEndDate());
      const neverFireRuleId = await createESQLRule(
        supertest,
        objectRemover,
        connectorId,
        { name: 'never fire' },
        'from kibana-alerting-test-data | stats c = count(date) by group | where c < 0'
      );
      const alwaysFireRuleId = await createESQLRule(
        supertest,
        objectRemover,
        connectorId,
        { name: 'always fire' },
        'from kibana-alerting-test-data | stats c = count(date) by group | where c > 0'
      );
      let docs = await waitForDocs(1);

      // Run 2:
      // 1 - write more source documents
      // 2 - manually run the rules with runSoon
      // 3 - wait for output doc to be written, indicating rule is done running
      await createEsDocumentsInGroups(ES_GROUPS_TO_WRITE, getEndDate());
      await Promise.all([runSoon(neverFireRuleId), runSoon(alwaysFireRuleId)]);

      // a total of 2 index actions should have been triggered, resulting in 2 docs in the output index
      docs = await waitForDocs(2);

      for (let i = 0; i < docs.length; i++) {
        const doc = docs[i];
        const { hits } = doc._source;
        const { name, title, message } = doc._source.params;

        expect(name).to.be('always fire');
        expect(title).to.be(`rule 'always fire' matched query`);
        expect(message).to.match(
          /Document count is \d+.?\d* in the last 1h. Alert when greater than 0./
        );
        expect(hits).not.to.be.empty();
      }

      const aadDocs = await getAADDocsForRule(alwaysFireRuleId, 1);

      const alertDoc = aadDocs.body.hits.hits[0]._source;
      expect(alertDoc[ALERT_REASON]).to.match(
        /Document count is \d+.?\d* in the last 1h. Alert when greater than 0./
      );
      expect(alertDoc['kibana.alert.title']).to.be("rule 'always fire' matched query");
      expect(alertDoc['kibana.alert.evaluation.conditions']).to.be('Query matched documents');
      expect(alertDoc['kibana.alert.evaluation.threshold']).to.eql(0);
      const value = parseInt(alertDoc['kibana.alert.evaluation.value'], 10);
      expect(value).greaterThan(0);
      expect(alertDoc[ALERT_URL]).to.contain('/s/space1/app/');
    });

    it('runs correctly: threshold on ungrouped hit count < >', async () => {
      // this test runs the rule once, injecting data before the first run
      // the rule should fire each time, triggering an index action each time

      // Run 1:
      // 1 - write source documents
      // 2 - create the rule - it runs one time on creation
      // 3 - wait for output doc to be written, indicating rule is done running
      await createGroupedEsDocumentsInGroups(ES_GROUPS_TO_WRITE, getEndDate());
      const ruleId = await createESQLRule(
        supertest,
        objectRemover,
        connectorId,
        { name: 'always fire' },
        'from kibana-alerting-test-data | stats c = count(date) by group | where c > 0'
      );
      const docs = await waitForDocs(1);

      const doc = docs[0];
      const { hits } = doc._source;
      const { name, title, message } = doc._source.params;

      expect(name).to.be('always fire');
      expect(title).to.be(`rule 'always fire' matched query`);
      expect(message).to.match(
        /Document count is \d+.?\d* in the last 1h. Alert when greater than 0./
      );
      expect(hits).not.to.be.empty();

      const aadDocs = await getAADDocsForRule(ruleId, 1);

      const alertDoc = aadDocs.body.hits.hits[0]._source;
      expect(alertDoc[ALERT_REASON]).to.match(
        /Document count is \d+.?\d* in the last 1h. Alert when greater than 0./
      );
      expect(alertDoc['kibana.alert.title']).to.be("rule 'always fire' matched query");
      expect(alertDoc['kibana.alert.evaluation.conditions']).to.be('Query matched documents');
      expect(alertDoc['kibana.alert.evaluation.threshold']).to.eql(0);
      const value = parseInt(alertDoc['kibana.alert.evaluation.value'], 10);
      expect(value).greaterThan(0);
      expect(alertDoc[ALERT_URL]).to.contain('/s/space1/app/');
    });

    it('runs correctly: threshold on grouped hit with stats...by', async () => {
      // this test runs the rule once, injecting data before the first run
      // the rule should fire each time, triggering an index action each time

      // Run 1:
      // 1 - write source documents
      // 2 - create the rule - it runs one time on creation
      // 3 - wait for output doc to be written, indicating rule is done running
      await createGroupedEsDocumentsInGroups(ES_GROUPS_TO_WRITE, getEndDate());
      const ruleId = await createESQLRule(
        supertest,
        objectRemover,
        connectorId,
        { name: 'always fire', groupBy: 'row' },
        'from kibana-alerting-test-data | stats c = count(date) by group | where c > 0'
      );

      const docs = await waitForDocs(3);
      const titlePattern = /rule 'always fire' matched query for group group-\d/;
      const messagePattern =
        /Document count is 1 in the last 1h for group-\d. Alert when greater than 0./;
      const conditionPattern = /Query matched documents for group "group-\d"/;
      const groupPattern = /{"group":"group-\d"}/;

      for (let i = 0; i < docs.length; i++) {
        const doc = docs[i];
        const { hits, grouping } = doc._source;
        const { name, title, message } = doc._source.params;
        expect(name).to.be('always fire');
        expect(title).to.match(titlePattern);
        expect(message).to.match(messagePattern);
        expect(hits).not.to.be.empty();
        expect(grouping).to.match(groupPattern);
      }

      const aadDocs = await getAADDocsForRule(ruleId, 3, ALERT_INSTANCE_ID);

      for (let i = 0; i < aadDocs.body.hits.hits.length; i++) {
        const alertDoc = aadDocs.body.hits.hits[i]._source;
        expect(alertDoc[ALERT_INSTANCE_ID]).to.be(`group-${i}`);
        expect(alertDoc['kibana.alert.title']).to.match(titlePattern);
        expect(alertDoc[ALERT_REASON]).to.match(messagePattern);
        expect(alertDoc['kibana.alert.evaluation.conditions']).to.match(conditionPattern);
        expect(alertDoc['kibana.alert.evaluation.threshold']).to.eql(0);
        const value = parseInt(alertDoc['kibana.alert.evaluation.value'], 10);
        expect(value).to.be(1);
        expect(alertDoc[ALERT_URL]).to.contain('/s/space1/app/');
      }
    });

    it('runs correctly: threshold on grouped hit with METADATA _id', async () => {
      // this test runs the rule once, injecting data before the first run
      // the rule should fire each time, triggering an index action each time

      // Run 1:
      // 1 - write source documents
      // 2 - create the rule - it runs one time on creation
      // 3 - wait for output doc to be written, indicating rule is done running
      await createGroupedEsDocumentsInGroups(1, getEndDate());
      const ruleId = await createESQLRule(
        supertest,
        objectRemover,
        connectorId,
        { name: 'always fire', groupBy: 'row' },
        'from kibana-alerting-test-data METADATA _id | keep group, _id | limit 10'
      );

      const docs = await waitForDocs(4);
      const titlePattern =
        /rule 'always fire' matched query for group [a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}/;
      const messagePattern =
        /Document count is 1 in the last 1h for [a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}. Alert when greater than 0./;
      const conditionPattern =
        /Query matched documents for group "[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}"/;
      const idPattern =
        /[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}/;
      const groupPattern =
        /{"_id":"[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}"}/;

      for (let i = 0; i < docs.length; i++) {
        const doc = docs[i];
        const { hits, grouping } = doc._source;
        const { name, title, message } = doc._source.params;
        expect(name).to.be('always fire');
        expect(title).to.match(titlePattern);
        expect(message).to.match(messagePattern);
        expect(hits).not.to.be.empty();
        expect(grouping).to.match(groupPattern);
      }

      const aadDocs = await getAADDocsForRule(ruleId, 2);
      for (let i = 0; i < aadDocs.body.hits.hits.length; i++) {
        const alertDoc = aadDocs.body.hits.hits[i]._source;
        expect(alertDoc[ALERT_INSTANCE_ID]).to.match(idPattern);
        expect(alertDoc['kibana.alert.title']).to.match(titlePattern);
        expect(alertDoc[ALERT_REASON]).to.match(messagePattern);
        expect(alertDoc['kibana.alert.evaluation.conditions']).to.match(conditionPattern);
        expect(alertDoc['kibana.alert.evaluation.threshold']).to.eql(0);
        const value = parseInt(alertDoc['kibana.alert.evaluation.value'], 10);
        expect(value).to.be(1);
        expect(alertDoc[ALERT_URL]).to.contain('/s/space1/app/');
      }
    });

    it('runs correctly: threshold on grouped hit with all columns', async () => {
      // This test is sensitive to the fields in the index; when adding new fields,
      // you should drop them here, as it has a limit of 10 or so for grouping,
      // or otherwise change the grouping values that result.
      const columnsToDrop = ['tags'];

      // this test runs the rule once, injecting data before the first run
      // the rule should fire each time, triggering an index action each time

      // Run 1:
      // 1 - write source documents
      // 2 - create the rule - it runs one time on creation
      // 3 - wait for output doc to be written, indicating rule is done running
      await createEsDocumentsInGroups(ES_GROUPS_TO_WRITE, getEndDate());
      const ruleId = await createESQLRule(
        supertest,
        objectRemover,
        connectorId,
        { name: 'always fire', groupBy: 'row' },
        `from kibana-alerting-test-data | drop ${columnsToDrop}`
      );

      const docs = await waitForDocs(3);
      const titlePattern = /rule 'always fire' matched query for group .*/;
      const messagePattern =
        /Document count is 1 in the last 1h for .*\. Alert when greater than 0\./;
      const conditionPattern = /Query matched documents for group ".*"/;

      for (let i = 0; i < docs.length; i++) {
        const doc = docs[i];
        const { hits } = doc._source;
        const grouping = JSON.parse(doc._source.grouping);
        const { name, title, message } = doc._source.params;
        expect(name).to.be('always fire');
        expect(title).to.match(titlePattern);
        expect(message).to.match(messagePattern);
        expect(hits).not.to.be.empty();
        expect(grouping['@timestamp']).to.be.ok();
        expect(grouping.date).to.be.ok();
        expect(grouping.date_epoch_millis).to.be.ok();
        expect(grouping.group).to.be.ok();
        expect(grouping.host.hostname).to.be.ok();
        expect(grouping.host.id).to.be.ok();
        expect(grouping.host.name).to.be.ok();
        expect(grouping.reference).to.be.ok();
        expect(grouping.source).not.to.be(undefined);
        expect(grouping.testedValue).to.be.ok();
        expect(grouping.testedValueFloat).to.be.ok();
      }

      const aadDocs = await getAADDocsForRule(ruleId, 3);
      for (let i = 0; i < aadDocs.body.hits.hits.length; i++) {
        const alertDoc = aadDocs.body.hits.hits[i]._source;
        expect(alertDoc['kibana.alert.title']).to.match(titlePattern);
        expect(alertDoc[ALERT_REASON]).to.match(messagePattern);
        expect(alertDoc['kibana.alert.evaluation.conditions']).to.match(conditionPattern);
        expect(alertDoc['kibana.alert.evaluation.threshold']).to.eql(0);
        const value = parseInt(alertDoc['kibana.alert.evaluation.value'], 10);
        expect(value).to.be(1);
        expect(alertDoc[ALERT_URL]).to.contain('/s/space1/app/');
      }
    });

    it('runs correctly: use epoch millis - threshold on hit count < >', async () => {
      // this test runs the rule once, injecting data before the first run
      // the rule should fire each time, triggering an index action each time

      // Run 1:
      // 1 - write source documents
      // 2 - create the rule - it runs one time on creation
      // 3 - wait for output doc to be written, indicating rule is done running
      await createEsDocumentsInGroups(ES_GROUPS_TO_WRITE, getEndDate());
      await createESQLRule(
        supertest,
        objectRemover,
        connectorId,
        { name: 'always fire', timeField: 'date_epoch_millis' },
        'from kibana-alerting-test-data | stats c = count(date) | where c > 0'
      );
      const docs = await waitForDocs(1);

      const doc = docs[0];
      const { hits } = doc._source;
      const { name, title, message } = doc._source.params;

      expect(name).to.be('always fire');
      expect(title).to.be(`rule 'always fire' matched query`);
      const messagePattern = /Document count is \d+ in the last 1h. Alert when greater than 0./;
      expect(message).to.match(messagePattern);
      expect(hits).not.to.be.empty();
    });

    it('runs correctly: no matches', async () => {
      // purposely skip creating ES documents so the index is empty
      await createESQLRule(
        supertest,
        objectRemover,
        connectorId,
        { name: 'always fire' },
        'from kibana-alerting-test-data | stats c = count(date) | where c < 1'
      );

      const docs = await waitForDocs(1);
      const doc = docs[0];
      const { hits } = doc._source;
      const { name, title, message } = doc._source.params;

      expect(name).to.be('always fire');
      expect(title).to.be(`rule 'always fire' matched query`);
      const messagePattern = /Document count is \d+ in the last 1h. Alert when greater than 0./;
      expect(message).to.match(messagePattern);
      expect(hits).not.to.be.empty();
    });

    it('runs correctly and populates recovery context', async () => {
      // This rule should be active initially when the number of documents is below the threshold
      // and then recover when we add more documents.

      // this test runs the rule twice, injecting data after the first run
      // the rule should fire the first run when there is no data in the index and
      // then recover the second run after data is injected

      // Run 1:
      // 1 - skip writing source documents
      // 2 - create the rule - they run one time on creation
      // 3 - wait for output doc to be written, indicating rule is done running
      const ruleId = await createESQLRule(
        supertest,
        objectRemover,
        connectorId,
        { name: 'fire then recovers', notifyWhen: 'onActionGroupChange' },
        'from kibana-alerting-test-data | stats c = count(date) | where c < 1'
      );

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
      expect(activeValue).to.be('1');
      expect(activeMessage).to.match(
        /Document count is \d+ in the last 1h. Alert when greater than 0./
      );

      // Run 2:
      // 1 - write source documents
      // 2 - manually run the rule with runSoon
      // 3 - wait for output doc to be written, indicating rule is done running
      await createEsDocumentsInGroups(1, getEndDate());
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
        /Document count is \d+ in the last 1h. Alert when greater than 0./
      );
    });

    it('runs correctly and populates source data', async () => {
      // this test runs the rule once, injecting data before the first run
      // the rule should fire each time, triggering an index action each time

      // Run 1:
      // 1 - write source documents
      // 2 - create the rule - it runs one time on creation
      // 3 - wait for output doc to be written, indicating rule is done running
      await createEsDocumentsInGroups(ES_GROUPS_TO_WRITE, getEndDate());
      const ruleId = await createESQLRule(
        supertest,
        objectRemover,
        connectorId,
        { name: 'always fire' },
        'from kibana-alerting-test-data | stats c = count(date) by host.hostname, host.name, host.id | where c > 0'
      );

      const docs = await waitForDocs(1);
      const messagePattern = /Document count is \d+ in the last 1h. Alert when greater than 0./;

      const doc = docs[0];
      const { hits } = doc._source;
      const { name, title, message } = doc._source.params;

      expect(name).to.be('always fire');
      expect(title).to.be(`rule 'always fire' matched query`);
      expect(message).to.match(messagePattern);
      expect(hits).not.to.be.empty();

      const aadDocs = await getAADDocsForRule(ruleId, 1);

      const alertDoc = aadDocs.body.hits.hits[0]._source;
      expect(alertDoc[ALERT_REASON]).to.match(messagePattern);
      expect(alertDoc['kibana.alert.title']).to.be("rule 'always fire' matched query");
      expect(alertDoc['kibana.alert.evaluation.conditions']).to.be('Query matched documents');
      expect(alertDoc['host.name']).to.eql(['host-1']);
      expect(alertDoc['host.hostname']).to.eql(['host-1']);
      expect(alertDoc['host.id']).to.eql(['1']);
    });

    it('runs correctly over a data stream: threshold on hit count < >', async () => {
      // This runs the same test as above but specifically targets a data stream index

      // this test runs the rule once, injecting data before the first run
      // the rule should fire each time, triggering an index action each time

      // Run 1:
      // 1 - write source documents
      // 2 - create the rule - it runs one time on creation
      // 3 - wait for output doc to be written, indicating rule is done running
      await createEsDocumentsInGroups(
        ES_GROUPS_TO_WRITE,
        getEndDate(),
        esTestIndexToolDataStream,
        ES_TEST_DATA_STREAM_NAME
      );
      const ruleId = await createESQLRule(
        supertest,
        objectRemover,
        connectorId,
        { name: 'always fire' },
        'from test-data-stream | stats c = count(@timestamp) by host.hostname, host.name, host.id | where c > 0'
      );
      const docs = await waitForDocs(1);

      const messagePattern = /Document count is \d+ in the last 1h. Alert when greater than 0./;

      const doc = docs[0];
      const { hits } = doc._source;
      const { name, title, message } = doc._source.params;

      expect(name).to.be('always fire');
      expect(title).to.be(`rule 'always fire' matched query`);
      expect(message).to.match(messagePattern);
      expect(hits).not.to.be.empty();

      const aadDocs = await getAADDocsForRule(ruleId, 1);

      const alertDoc = aadDocs.body.hits.hits[0]._source;
      expect(alertDoc[ALERT_REASON]).to.match(messagePattern);
      expect(alertDoc['kibana.alert.title']).to.be("rule 'always fire' matched query");
      expect(alertDoc['kibana.alert.evaluation.conditions']).to.be('Query matched documents');
      const value = parseInt(alertDoc['kibana.alert.evaluation.value'], 10);
      expect(value).greaterThan(0);
      expect(alertDoc[ALERT_URL]).to.contain('/s/space1/app/');
      expect(alertDoc['host.name']).to.eql(['host-1']);
      expect(alertDoc['host.hostname']).to.eql(['host-1']);
      expect(alertDoc['host.id']).to.eql(['1']);
    });

    it('throws an error if the thresholdComparator is not >', async () => {
      const { body } = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'test',
          consumer: 'alerts',
          enabled: true,
          rule_type_id: RULE_TYPE_ID,
          schedule: { interval: `${RULE_INTERVAL_SECONDS}s` },
          actions: [],
          notify_when: 'onActiveAlert',
          params: {
            size: 100,
            timeWindowSize: RULE_INTERVAL_SECONDS * 5,
            timeWindowUnit: 's',
            thresholdComparator: '<',
            threshold: [0],
            searchType: 'esqlQuery',
            timeField: 'date',
            esqlQuery: {
              esql: 'from kibana-alerting-test-data | stats c = count(date) | where c < 0',
            },
          },
        })
        .expect(400);
      expect(body.message).to.be(
        'params invalid: [thresholdComparator]: is required to be greater than'
      );
    });

    it('throws an error if the threshold is not [0]', async () => {
      const { body } = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'test',
          consumer: 'alerts',
          enabled: true,
          rule_type_id: RULE_TYPE_ID,
          schedule: { interval: `${RULE_INTERVAL_SECONDS}s` },
          actions: [],
          notify_when: 'onActiveAlert',
          params: {
            size: 100,
            timeWindowSize: RULE_INTERVAL_SECONDS * 5,
            timeWindowUnit: 's',
            thresholdComparator: '>',
            threshold: [100],
            searchType: 'esqlQuery',
            timeField: 'date',
            esqlQuery: {
              esql: 'from kibana-alerting-test-data | stats c = count(date) | where c < 0',
            },
          },
        })
        .expect(400);
      expect(body.message).to.be('params invalid: [threshold]: is required to be 0');
    });

    it('throws an error if the timeField is undefined', async () => {
      const { body } = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'test',
          consumer: 'alerts',
          enabled: true,
          rule_type_id: RULE_TYPE_ID,
          schedule: { interval: `${RULE_INTERVAL_SECONDS}s` },
          actions: [],
          notify_when: 'onActiveAlert',
          params: {
            size: 100,
            timeWindowSize: RULE_INTERVAL_SECONDS * 5,
            timeWindowUnit: 's',
            thresholdComparator: '>',
            threshold: [0],
            searchType: 'esqlQuery',
            esqlQuery: {
              esql: 'from kibana-alerting-test-data | stats c = count(date) | where c < 0',
            },
          },
        })
        .expect(400);
      expect(body.message).to.be('params invalid: [timeField]: is required');
    });

    it('throws an error if the esqlQuery is undefined', async () => {
      const { body } = await supertest
        .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule`)
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'test',
          consumer: 'alerts',
          enabled: true,
          rule_type_id: RULE_TYPE_ID,
          schedule: { interval: `${RULE_INTERVAL_SECONDS}s` },
          actions: [],
          notify_when: 'onActiveAlert',
          params: {
            size: 100,
            timeWindowSize: RULE_INTERVAL_SECONDS * 5,
            timeWindowUnit: 's',
            thresholdComparator: '>',
            threshold: [0],
            searchType: 'esqlQuery',
            timeField: 'date',
          },
        })
        .expect(400);
      expect(body.message).to.be(
        'params invalid: [esqlQuery.esql]: expected value of type [string] but got [undefined]'
      );
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
  });
}
