/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { Client } from '@elastic/elasticsearch';
import type { SearchHit } from '@elastic/elasticsearch/lib/api/types';
import type { Alert } from '@kbn/alerts-as-data-utils';
import { ESTestIndexTool } from '@kbn/alerting-api-integration-helpers';
import { basename } from 'node:path';
import { v4 as uuidv4 } from 'uuid';
import { get, omit } from 'lodash';
import {
  ALERT_ACTION_GROUP,
  ALERT_CASE_IDS,
  ALERT_INSTANCE_ID,
  ALERT_STATUS,
  ALERT_WORKFLOW_STATUS,
  ALERT_WORKFLOW_TAGS,
  ALERT_CONSECUTIVE_MATCHES,
} from '@kbn/rule-data-utils';
import type { FtrProviderContext } from '../../../../../common/ftr_provider_context';
import { Spaces } from '../../../../scenarios';
import { getTestRuleData, getUrlPrefix, ObjectRemover } from '../../../../../common/lib';

type AlertDoc = Alert & { runCount: number };

// sort results of a search of alert docs by alert instance id
function sortAlertDocsByInstanceId(a: SearchHit<AlertDoc>, b: SearchHit<AlertDoc>) {
  return a._source![ALERT_INSTANCE_ID].localeCompare(b._source![ALERT_INSTANCE_ID]);
}

export default function createAlertsAsDataInstallResourcesTest({ getService }: FtrProviderContext) {
  const es = getService('es');
  const retry = getService('retry');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const objectRemover = new ObjectRemover(supertestWithoutAuth);
  const esTestIndexTool = new ESTestIndexTool(es, retry);

  describe('document conflicts during rule execution', () => {
    before(async () => {
      await esTestIndexTool.setup();
    });

    after(async () => {
      await objectRemover.removeAll();
      await esTestIndexTool.destroy();
    });

    const ruleType = 'test.waitingRule';
    const aadIndex = `.alerts-${ruleType.toLowerCase()}.alerts-default`;

    describe(`should be handled for alerting framework based AaD`, function () {
      this.tags('skipFIPS');
      it('for a single conflicted alert', async () => {
        const source = uuidv4();
        const count = 1;
        const params = { source, alerts: count };
        const createdRule = await supertestWithoutAuth
          .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule`)
          .set('kbn-xsrf', 'foo')
          .send(
            getTestRuleData({
              name: `${basename(__filename)} ${ruleType} ${source}}`,
              rule_type_id: ruleType,
              schedule: { interval: '1s' },
              throttle: null,
              params,
              actions: [],
            })
          );

        if (createdRule.status !== 200) {
          log(`error creating rule: ${JSON.stringify(createdRule, null, 4)}`);
        }
        expect(createdRule.status).to.eql(200);

        const ruleId = createdRule.body.id;
        objectRemover.add(Spaces.space1.id, ruleId, 'rule', 'alerting');

        // this rule type uses esTextIndexTool documents to communicate
        // with the rule executor.  Once the rule starts executing, it
        // "sends" `rule-starting-<n>`, which this code waits for.  It
        // then updates the alert doc, and "sends" `rule-complete-<n>`.
        // which the rule executor is waiting on, to complete the rule
        // execution.
        log(`signal the rule to finish the first run`);
        await esTestIndexTool.indexDoc(source, 'rule-complete-1');

        log(`wait for the first alert doc to be created`);
        const initialDocs = await waitForAlertDocs(aadIndex, ruleId, count);
        expect(initialDocs.length).to.eql(count);

        log(`wait for the start of the next execution`);
        await esTestIndexTool.waitForDocs(source, 'rule-starting-2');

        log(`ad-hoc update the alert doc`);
        await adHocUpdate(es, aadIndex, initialDocs[0]._id!);

        log(`signal the rule to finish`);
        await esTestIndexTool.indexDoc(source, 'rule-complete-2');

        log(`wait for the start of the next execution`);
        await esTestIndexTool.waitForDocs(source, 'rule-starting-3');

        log(`get the updated alert doc`);
        const updatedDocs = await waitForAlertDocs(aadIndex, ruleId, count);
        expect(updatedDocs.length).to.eql(1);

        log(`signal the rule to finish, then delete it`);
        await esTestIndexTool.indexDoc(source, 'rule-complete-3');
        await objectRemover.removeAll();

        // compare the initial and updated alert docs
        compareAlertDocs(initialDocs[0], updatedDocs[0], true);
      });

      it('for a mix of successful and conflicted alerts', async () => {
        const source = uuidv4();
        const count = 5;
        const params = { source, alerts: count };
        const createdRule = await supertestWithoutAuth
          .post(`${getUrlPrefix(Spaces.space1.id)}/api/alerting/rule`)
          .set('kbn-xsrf', 'foo')
          .send(
            getTestRuleData({
              name: `${basename(__filename)} ${ruleType} ${source}}`,
              rule_type_id: ruleType,
              schedule: { interval: '1s' },
              throttle: null,
              params,
              actions: [],
            })
          );

        if (createdRule.status !== 200) {
          log(`error creating rule: ${JSON.stringify(createdRule, null, 4)}`);
        }
        expect(createdRule.status).to.eql(200);

        const ruleId = createdRule.body.id;
        objectRemover.add(Spaces.space1.id, ruleId, 'rule', 'alerting');

        log(`signal the rule to finish the first run`);
        await esTestIndexTool.indexDoc(source, 'rule-complete-1');

        log(`wait for the first alert doc to be created`);
        const initialDocs = await waitForAlertDocs(aadIndex, ruleId, count);
        initialDocs.sort(sortAlertDocsByInstanceId);
        expect(initialDocs.length).to.eql(5);

        log(`wait for the start of the next execution`);
        await esTestIndexTool.waitForDocs(source, 'rule-starting-2');

        log(`ad-hoc update the 2nd and 4th alert docs`);
        await adHocUpdate(es, aadIndex, initialDocs[1]._id!);
        await adHocUpdate(es, aadIndex, initialDocs[3]._id!);

        log(`signal the rule to finish`);
        await esTestIndexTool.indexDoc(source, 'rule-complete-2');

        log(`wait for the start of the next execution`);
        await esTestIndexTool.waitForDocs(source, 'rule-starting-3');

        log(`get the updated alert doc`);
        const updatedDocs = await waitForAlertDocs(aadIndex, ruleId, count);
        updatedDocs.sort(sortAlertDocsByInstanceId);
        expect(updatedDocs.length).to.eql(5);

        log(`signal the rule to finish, then delete it`);
        await esTestIndexTool.indexDoc(source, 'rule-complete-3');
        await objectRemover.removeAll();

        // compare the initial and updated alert docs
        compareAlertDocs(initialDocs[0], updatedDocs[0], false);
        compareAlertDocs(initialDocs[1], updatedDocs[1], true);
        compareAlertDocs(initialDocs[2], updatedDocs[2], false);
        compareAlertDocs(initialDocs[3], updatedDocs[3], true);
        compareAlertDocs(initialDocs[4], updatedDocs[4], false);
      });
    });
  });

  // waits for a specified number of alert documents
  async function waitForAlertDocs(
    index: string,
    ruleId: string,
    count: number = 1
  ): Promise<Array<SearchHit<AlertDoc>>> {
    return await retry.try(async () => {
      const searchResult = await es.search<AlertDoc>({
        index,
        size: count,
        query: {
          bool: {
            must: [{ term: { 'kibana.alert.rule.uuid': ruleId } }],
          },
        },
      });

      const docs = searchResult.hits.hits as Array<SearchHit<AlertDoc>>;
      if (docs.length < count) throw new Error(`only ${docs.length} out of ${count} docs found`);

      return docs;
    });
  }
}

// general comparator for initial / updated alert documents
function compareAlertDocs(
  initialDoc: SearchHit<AlertDoc>,
  updatedDoc: SearchHit<AlertDoc>,
  conflicted: boolean
) {
  // ensure both rule run updates and other updates persisted
  if (!initialDoc) throw new Error('not enough initial docs');
  if (!updatedDoc) throw new Error('not enough updated docs');

  const initialAlert = initialDoc._source!;
  const updatedAlert = updatedDoc._source!;

  expect(initialAlert.runCount).to.be.greaterThan(0);
  expect(updatedAlert.runCount).not.to.eql(-1);
  expect(updatedAlert.runCount).to.be.greaterThan(initialAlert.runCount);

  if (conflicted) {
    expect(get(updatedAlert, 'kibana.alert.case_ids')).to.eql(
      get(DocUpdate, 'kibana.alert.case_ids')
    );
    expect(get(updatedAlert, 'kibana.alert.workflow_tags')).to.eql(
      get(DocUpdate, 'kibana.alert.workflow_tags')
    );
    expect(get(updatedAlert, 'kibana.alert.workflow_status')).to.eql(
      get(DocUpdate, 'kibana.alert.workflow_status')
    );
    expect(get(updatedAlert, 'kibana.alert.consecutive_matches')).to.eql(
      get(DocUpdate, 'kibana.alert.consecutive_matches') + 1
    );

    expect(get(initialAlert, 'kibana.alert.status')).to.be('active');
    expect(get(updatedAlert, 'kibana.alert.status')).to.be('untracked');
  }

  const initial = omit(initialAlert, SkipFields);
  const updated = omit(updatedAlert, SkipFields);

  expect(initial).to.eql(updated);
}

// perform an adhoc update to an alert doc
async function adHocUpdate(es: Client, index: string, id: string) {
  await es.update({ index, id, doc: DocUpdate, refresh: true });
}

// we'll do the adhoc updates with this data
const DocUpdate = {
  runCount: -1, // rule-specific field, will be overwritten by rule execution
  [ALERT_ACTION_GROUP]: 'not-the-default', // will be overwritten by rule execution
  // below are all fields that will NOT be overwritten by rule execution
  [ALERT_WORKFLOW_STATUS]: 'a-ok!',
  [ALERT_WORKFLOW_TAGS]: ['fee', 'fi', 'fo', 'fum'],
  [ALERT_CASE_IDS]: ['123', '456', '789'],
  [ALERT_STATUS]: 'untracked',
  [ALERT_CONSECUTIVE_MATCHES]: 1,
};

const SkipFields = [
  // dynamically changing fields we have no control over
  '@timestamp',
  'event.action',
  'kibana.alert.duration.us',
  'kibana.alert.flapping_history',
  'kibana.alert.rule.execution.uuid',
  'kibana.alert.rule.execution.timestamp',
  'kibana.alert.state',

  // fields under our control we test separately
  'runCount',
  'kibana.alert.status',
  'kibana.alert.case_ids',
  'kibana.alert.workflow_tags',
  'kibana.alert.workflow_status',
  'kibana.alert.consecutive_matches',
  'kibana.alert.severity_improving',
  'kibana.alert.previous_action_group',
];

function log(message: string) {
  // eslint-disable-next-line no-console
  console.log(`${new Date().toISOString()} ${message}`);
}
