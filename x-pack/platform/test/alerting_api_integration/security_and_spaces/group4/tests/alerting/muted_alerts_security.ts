/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { UserAtSpaceScenarios } from '../../../scenarios';
import type { FtrProviderContext } from '../../../../common/ftr_provider_context';
import {
  AlertUtils,
  getUrlPrefix,
  getTestRuleData,
  ObjectRemover,
  getUnauthorizedErrorMessage,
} from '../../../../common/lib';

export default function mutedAlertsSecurityTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');

  describe('muted alerts (security)', () => {
    const objectRemover = new ObjectRemover(supertest);

    after(() => objectRemover.removeAll());

    for (const scenario of UserAtSpaceScenarios) {
      const { user, space } = scenario;
      const alertUtils = new AlertUtils({ user, space, supertestWithoutAuth });

      describe(scenario.id, () => {
        it('should mute instance and reflect in GET rule with appropriate authorization', async () => {
          const { body: createdAlert } = await supertest
            .post(`${getUrlPrefix(space.id)}/api/alerting/rule`)
            .set('kbn-xsrf', 'foo')
            .send(
              getTestRuleData({
                enabled: false,
                schedule: { interval: '1m' },
                actions: [],
              })
            )
            .expect(200);
          objectRemover.add(space.id, createdAlert.id, 'rule', 'alerting');

          const muteResponse = await alertUtils.getMuteInstanceRequest(createdAlert.id, '1');

          switch (scenario.id) {
            case 'no_kibana_privileges at space1':
            case 'space_1_all at space2':
            case 'global_read at space1':
              expect(muteResponse.statusCode).to.eql(403);
              expect(muteResponse.body).to.eql({
                error: 'Forbidden',
                message: getUnauthorizedErrorMessage('muteAlert', 'test.noop', 'alertsFixture'),
                statusCode: 403,
              });
              break;
            case 'space_1_all_alerts_none_actions at space1':
            case 'superuser at space1':
            case 'space_1_all at space1':
            case 'space_1_all_with_restricted_fixture at space1':
              expect(muteResponse.statusCode).to.eql(204);
              const { body: ruleAfterMute } = await supertestWithoutAuth
                .get(`${getUrlPrefix(space.id)}/api/alerting/rule/${createdAlert.id}`)
                .auth(user.username, user.password)
                .expect(200);
              expect(ruleAfterMute.muted_alert_ids || []).to.contain('1');

              const unmuteResponse = await alertUtils.getUnmuteInstanceRequest(
                createdAlert.id,
                '1'
              );
              expect(unmuteResponse.statusCode).to.eql(204);
              const { body: ruleAfterUnmute } = await supertestWithoutAuth
                .get(`${getUrlPrefix(space.id)}/api/alerting/rule/${createdAlert.id}`)
                .auth(user.username, user.password)
                .expect(200);
              expect(ruleAfterUnmute.muted_alert_ids || []).not.to.contain('1');
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });

        it('should accept conditional snooze and return snoozed_instances in GET rule when authorized', async () => {
          const { body: createdAlert } = await supertest
            .post(`${getUrlPrefix(space.id)}/api/alerting/rule`)
            .set('kbn-xsrf', 'foo')
            .send(
              getTestRuleData({
                enabled: false,
                schedule: { interval: '1m' },
                actions: [],
              })
            )
            .expect(200);
          objectRemover.add(space.id, createdAlert.id, 'rule', 'alerting');

          const expiresAt = new Date(Date.now() + 86400000).toISOString();
          let snoozeRequest = supertestWithoutAuth
            .post(
              `${getUrlPrefix(space.id)}/api/alerting/rule/${
                createdAlert.id
              }/alert/1/_mute?validate_alerts_existence=false`
            )
            .set('kbn-xsrf', 'foo')
            .send({ expires_at: expiresAt });
          if (user) {
            snoozeRequest = snoozeRequest.auth(user.username, user.password);
          }
          const snoozeResult = await snoozeRequest;

          switch (scenario.id) {
            case 'no_kibana_privileges at space1':
            case 'space_1_all at space2':
            case 'global_read at space1':
              expect(snoozeResult.statusCode).to.eql(403);
              break;
            case 'space_1_all_alerts_none_actions at space1':
            case 'superuser at space1':
            case 'space_1_all at space1':
            case 'space_1_all_with_restricted_fixture at space1':
              expect(snoozeResult.statusCode).to.eql(204);
              const { body: rule } = await supertestWithoutAuth
                .get(`${getUrlPrefix(space.id)}/api/alerting/rule/${createdAlert.id}`)
                .auth(user!.username, user!.password)
                .expect(200);
              expect(rule.snoozed_instances).to.have.length(1);
              expect(rule.snoozed_instances[0].instance_id).to.eql('1');
              expect(rule.snoozed_instances[0].expires_at).to.eql(expiresAt);
              break;
            default:
              throw new Error(`Scenario untested: ${JSON.stringify(scenario)}`);
          }
        });
      });
    }
  });
}
