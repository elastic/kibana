/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { ESTestIndexTool, ES_TEST_INDEX_NAME } from '@kbn/alerting-api-integration-helpers';
import { getEventLog, ObjectRemover } from '../../../common/lib';
import type { FtrProviderContext } from '../../../common/ftr_provider_context';

export default function connectorNotFoundTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  describe('rule action with a connector that no longer exists', () => {
    const objectRemover = new ObjectRemover(supertest);
    const retry = getService('retry');
    const es = getService('es');
    const esTestIndexTool = new ESTestIndexTool(es, retry);

    const createConnector = async (name: string): Promise<string> => {
      const { body } = await supertest
        .post('/api/actions/connector')
        .set('kbn-xsrf', 'foo')
        .send({
          name,
          connector_type_id: 'test.index-record',
          config: { unencrypted: `This value shouldn't get encrypted` },
          secrets: { encrypted: 'This value should be encrypted' },
        })
        .expect(200);
      return body.id;
    };

    beforeEach(async () => {
      await esTestIndexTool.destroy();
      await esTestIndexTool.setup();
    });

    afterEach(async () => {
      await objectRemover.removeAll();
      await esTestIndexTool.destroy();
    });

    it('runs the actions of the other connectors and reports a warning', async () => {
      const existingConnectorId = await createConnector('Existing connector');
      objectRemover.add('default', existingConnectorId, 'connector', 'actions');
      const deletedConnectorId = await createConnector('Deleted connector');

      const [existingConnectorAction, deletedConnectorAction] = [
        { id: existingConnectorId, reference: 'existing-connector' },
        { id: deletedConnectorId, reference: 'deleted-connector' },
      ].map(({ id, reference }) => ({
        id,
        group: 'query matched',
        params: { index: ES_TEST_INDEX_NAME, reference, message: '' },
        frequency: { summary: false, throttle: null, notify_when: 'onActiveAlert' },
      }));

      // The rule is created disabled so the connector is deleted before the first run.
      const { body: rule } = await supertest
        .post('/api/alerting/rule')
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'abc',
          consumer: 'alertsFixture',
          enabled: false,
          rule_type_id: '.es-query',
          schedule: { interval: '1h' },
          actions: [deletedConnectorAction, existingConnectorAction],
          notify_when: undefined,
          params: {
            size: 100,
            timeWindowSize: 20,
            timeWindowUnit: 's',
            thresholdComparator: '>',
            threshold: [-1],
            esQuery: `{\n  \"query\":{\n    \"match_all\" : {}\n  }\n}`,
            timeField: 'date',
            index: [ES_TEST_INDEX_NAME],
          },
        })
        .expect(200);
      const ruleId = rule.id;
      objectRemover.add('default', ruleId, 'rule', 'alerting');

      await supertest
        .delete(`/api/actions/connector/${deletedConnectorId}`)
        .set('kbn-xsrf', 'foo')
        .expect(204);

      await supertest
        .post(`/api/alerting/rule/${ruleId}/_enable`)
        .set('kbn-xsrf', 'foo')
        .expect(204);

      const events = await retry.try(async () => {
        return await getEventLog({
          getService,
          spaceId: 'default',
          type: 'alert',
          id: ruleId,
          provider: 'alerting',
          actions: new Map([['execute', { gte: 1 }]]),
        });
      });

      const warningMessage = `Actions were not triggered because their connectors no longer exist: ${deletedConnectorId}`;

      // the run succeeds with a warning instead of failing
      const executeEvent = events[0];
      expect(executeEvent?.event?.outcome).to.eql('success');
      expect(executeEvent?.kibana?.alerting?.status).to.eql('warning');
      expect(executeEvent?.message).to.eql(warningMessage);
      expect(
        executeEvent?.kibana?.alert?.rule?.execution?.metrics?.number_of_generated_actions
      ).to.eql(2);
      expect(
        executeEvent?.kibana?.alert?.rule?.execution?.metrics?.number_of_triggered_actions
      ).to.eql(1);

      // only the action of the existing connector is reported as executed
      const executeActionEvents = await getEventLog({
        getService,
        spaceId: 'default',
        type: 'alert',
        id: ruleId,
        provider: 'alerting',
        actions: new Map([['execute-action', { equal: 1 }]]),
      });
      const actionSavedObject = executeActionEvents[0]?.kibana?.saved_objects?.find(
        ({ type }) => type === 'action'
      );
      expect(actionSavedObject?.id).to.eql(existingConnectorId);

      // the action of the existing connector ran, the one of the deleted connector did not
      await esTestIndexTool.waitForDocs('action:test.index-record', 'existing-connector', 1);
      const deletedConnectorDocs = await esTestIndexTool.search(
        'action:test.index-record',
        'deleted-connector'
      );
      expect(deletedConnectorDocs.body.hits.hits.length).to.eql(0);

      const { body: updatedRule } = await supertest.get(`/api/alerting/rule/${ruleId}`).expect(200);
      expect(updatedRule.execution_status.status).to.eql('warning');
      expect(updatedRule.execution_status.warning.message).to.eql(warningMessage);
      expect(updatedRule.last_run.outcome).to.eql('warning');
    });
  });
}
