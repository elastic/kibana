/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { CaseStatusesConfiguration } from '@kbn/cases-plugin/common/types/domain';
import { CaseStatuses, UserActionTypes } from '@kbn/cases-plugin/common/types/domain';
import { CaseMetricsFeature } from '@kbn/cases-plugin/common/types/api';
import type { FtrProviderContext } from '../../../common/ftr_provider_context';
import { postCaseReq } from '../../../common/lib/mock';
import {
  createCase,
  createConfiguration,
  deleteAllCaseItems,
  deleteConfiguration,
  findCases,
  findCaseUserActions,
  getCaseMetrics,
  getConfigurationRequest,
  updateCase,
  updateConfiguration,
} from '../../../common/lib/api';
import { secOnlyNoDelete, superUser } from '../../../common/lib/authentication/users';

const status = (
  overrides: Partial<CaseStatusesConfiguration[number]> & { key: string; label: string }
): CaseStatusesConfiguration[number] => ({
  category: CaseStatuses.open,
  order: 0,
  isDefault: false,
  disabled: false,
  ...overrides,
});

const statuses: CaseStatusesConfiguration = [
  status({ key: 'open', label: 'New', isDefault: true }),
  status({
    key: 'in-progress',
    label: 'Investigating',
    category: CaseStatuses['in-progress'],
    order: 1,
    isDefault: true,
  }),
  status({
    key: 'awaiting_customer',
    label: 'Awaiting customer',
    category: CaseStatuses['in-progress'],
    order: 2,
  }),
  status({
    key: 'retired',
    label: 'Retired',
    category: CaseStatuses['in-progress'],
    order: 3,
    disabled: true,
  }),
  status({
    key: 'closed',
    label: 'Closed',
    category: CaseStatuses.closed,
    order: 4,
    isDefault: true,
  }),
  status({ key: 'resolved', label: 'Resolved', category: CaseStatuses.closed, order: 5 }),
];

const onHold = status({
  key: 'on_hold',
  label: 'On hold',
  category: CaseStatuses['in-progress'],
  order: 6,
  pausesTimeTracking: true,
});
const pausingStatuses: CaseStatusesConfiguration = [...statuses, onHold];
const pauseReasons = ['Awaiting customer', 'Awaiting vendor'];

export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const es = getService('es');

  describe('custom statuses', () => {
    afterEach(async () => {
      await deleteAllCaseItems(es);
      await deleteConfiguration(es);
    });

    describe('configuration', () => {
      it('stores the configured statuses', async () => {
        const configuration = await createConfiguration(
          supertest,
          getConfigurationRequest({ overrides: { statuses } })
        );

        expect(configuration.statuses).to.eql(statuses);
      });

      it('rejects a list without a built-in status in its own category', async () => {
        await createConfiguration(
          supertest,
          getConfigurationRequest({
            overrides: { statuses: statuses.filter((item) => item.key !== 'closed') },
          }),
          400
        );
      });

      it('rejects duplicate keys and labels', async () => {
        await createConfiguration(
          supertest,
          getConfigurationRequest({
            overrides: {
              statuses: [...statuses, status({ key: 'awaiting_customer', label: 'Duplicate' })],
            },
          }),
          400
        );
        await createConfiguration(
          supertest,
          getConfigurationRequest({
            overrides: { statuses: [...statuses, status({ key: 'new', label: 'new' })] },
          }),
          400
        );
      });

      it('rejects a category without exactly one enabled default', async () => {
        await createConfiguration(
          supertest,
          getConfigurationRequest({
            overrides: {
              statuses: statuses.map((item) =>
                item.key === 'awaiting_customer' ? { ...item, isDefault: true } : item
              ),
            },
          }),
          400
        );
      });

      it('rejects removing a status or changing its category', async () => {
        const configuration = await createConfiguration(
          supertest,
          getConfigurationRequest({ overrides: { statuses } })
        );

        await updateConfiguration(
          supertest,
          configuration.id,
          {
            version: configuration.version,
            statuses: statuses.filter((item) => item.key !== 'awaiting_customer'),
          },
          400
        );
        await updateConfiguration(
          supertest,
          configuration.id,
          {
            version: configuration.version,
            statuses: statuses.map((item) =>
              item.key === 'awaiting_customer' ? { ...item, category: CaseStatuses.open } : item
            ),
          },
          400
        );
      });

      it('allows renaming, reordering, disabling and adding statuses', async () => {
        const configuration = await createConfiguration(
          supertest,
          getConfigurationRequest({ overrides: { statuses } })
        );
        const updatedStatuses = [
          ...statuses.map((item) =>
            item.key === 'awaiting_customer'
              ? { ...item, label: 'Waiting on customer', order: 3, disabled: true }
              : item.key === 'retired'
              ? { ...item, order: 2 }
              : item
          ),
          status({ key: 'triage', label: 'Triage', order: 5 }),
        ];

        const updated = await updateConfiguration(supertest, configuration.id, {
          version: configuration.version,
          statuses: updatedStatuses,
        });

        expect(updated.statuses).to.eql(updatedStatuses);
      });
    });

    describe('cases', () => {
      beforeEach(async () => {
        await createConfiguration(supertest, getConfigurationRequest({ overrides: { statuses } }));
      });

      it('creates a case on the default open status', async () => {
        const theCase = await createCase(supertest, postCaseReq);

        expect(theCase.status).to.be(CaseStatuses.open);
        expect(theCase.status_key).to.be('open');
      });

      it('moves a case to a configured status by key and records it', async () => {
        const theCase = await createCase(supertest, postCaseReq);
        const [patched] = await updateCase({
          supertest,
          params: {
            cases: [{ id: theCase.id, version: theCase.version, status_key: 'awaiting_customer' }],
          },
        });

        expect(patched.status).to.be(CaseStatuses['in-progress']);
        expect(patched.status_key).to.be('awaiting_customer');
        expect(patched.in_progress_at).to.be.a('string');

        const { userActions } = await findCaseUserActions({ supertest, caseID: theCase.id });
        const statusActions = userActions.filter(
          (action) => action.type === UserActionTypes.status
        );
        expect(statusActions).to.have.length(1);
        expect(statusActions[0].payload).to.eql({
          status: CaseStatuses['in-progress'],
          status_key: 'awaiting_customer',
        });
      });

      it('lands on the default status of the category when only a status is given', async () => {
        const theCase = await createCase(supertest, postCaseReq);
        const [patched] = await updateCase({
          supertest,
          params: {
            cases: [
              { id: theCase.id, version: theCase.version, status: CaseStatuses['in-progress'] },
            ],
          },
        });

        expect(patched.status_key).to.be('in-progress');
      });

      it('changes only the key when moving within a category', async () => {
        const theCase = await createCase(supertest, postCaseReq);
        const [inProgress] = await updateCase({
          supertest,
          params: {
            cases: [
              { id: theCase.id, version: theCase.version, status: CaseStatuses['in-progress'] },
            ],
          },
        });
        const [patched] = await updateCase({
          supertest,
          params: {
            cases: [
              { id: theCase.id, version: inProgress.version, status_key: 'awaiting_customer' },
            ],
          },
        });

        expect(patched.status).to.be(CaseStatuses['in-progress']);
        expect(patched.in_progress_at).to.be(inProgress.in_progress_at);
      });

      it('rejects unknown and disabled keys, and a status outside the key category', async () => {
        const theCase = await createCase(supertest, postCaseReq);
        const patch = (fields: { status_key: string; status?: CaseStatuses }) =>
          updateCase({
            supertest,
            params: { cases: [{ id: theCase.id, version: theCase.version, ...fields }] },
            expectedHttpCode: 400,
          });

        await patch({ status_key: 'unknown' });
        await patch({ status_key: 'retired' });
        await patch({ status_key: 'awaiting_customer', status: CaseStatuses.open });
      });

      it('finds cases by status key', async () => {
        const waiting = await createCase(supertest, postCaseReq);
        const open = await createCase(supertest, postCaseReq);
        await updateCase({
          supertest,
          params: {
            cases: [{ id: waiting.id, version: waiting.version, status_key: 'awaiting_customer' }],
          },
        });

        const byCustomKey = await findCases({
          supertest,
          query: { status_key: 'awaiting_customer' },
        });
        expect(byCustomKey.cases.map((item) => item.id)).to.eql([waiting.id]);

        const byDefaultKey = await findCases({ supertest, query: { status_key: ['open'] } });
        expect(byDefaultKey.cases.map((item) => item.id)).to.eql([open.id]);
        expect(byDefaultKey.count_in_progress_cases).to.be(1);
      });
    });

    describe('pausing', () => {
      describe('configuration', () => {
        it('stores statuses that pause time tracking and the pause reasons', async () => {
          const configuration = await createConfiguration(
            supertest,
            getConfigurationRequest({
              overrides: { statuses: pausingStatuses, pauseReasons },
            })
          );

          expect(configuration.statuses).to.eql(pausingStatuses);
          expect(configuration.pauseReasons).to.eql(pauseReasons);
        });

        it('rejects pausing on a closed status or on a category default', async () => {
          await createConfiguration(
            supertest,
            getConfigurationRequest({
              overrides: {
                statuses: [...statuses, { ...onHold, category: CaseStatuses.closed }],
                pauseReasons,
              },
            }),
            400
          );
          await createConfiguration(
            supertest,
            getConfigurationRequest({
              overrides: {
                statuses: statuses.map((item) =>
                  item.key === 'in-progress' ? { ...item, pausesTimeTracking: true } : item
                ),
                pauseReasons,
              },
            }),
            400
          );
        });

        it('rejects an empty or duplicated list of reasons while a status pauses', async () => {
          await createConfiguration(
            supertest,
            getConfigurationRequest({
              overrides: { statuses: pausingStatuses, pauseReasons: [] },
            }),
            400
          );
          await createConfiguration(
            supertest,
            getConfigurationRequest({
              overrides: {
                statuses: pausingStatuses,
                pauseReasons: ['Awaiting customer', 'awaiting customer'],
              },
            }),
            400
          );
        });
      });

      describe('cases', () => {
        beforeEach(async () => {
          await createConfiguration(
            supertest,
            getConfigurationRequest({ overrides: { statuses: pausingStatuses, pauseReasons } })
          );
        });

        const pause = (theCase: { id: string; version: string }, reason = 'Awaiting customer') =>
          updateCase({
            supertest,
            params: {
              cases: [
                {
                  id: theCase.id,
                  version: theCase.version,
                  status_key: 'on_hold',
                  pause_reason: reason,
                },
              ],
            },
          });

        it('requires one of the configured reasons to pause', async () => {
          const theCase = await createCase(supertest, postCaseReq);

          await updateCase({
            supertest,
            params: {
              cases: [{ id: theCase.id, version: theCase.version, status_key: 'on_hold' }],
            },
            expectedHttpCode: 400,
          });
          await updateCase({
            supertest,
            params: {
              cases: [
                {
                  id: theCase.id,
                  version: theCase.version,
                  status_key: 'on_hold',
                  pause_reason: 'Lunch',
                },
              ],
            },
            expectedHttpCode: 400,
          });
        });

        it('rejects a reason when the target status does not pause', async () => {
          const theCase = await createCase(supertest, postCaseReq);

          await updateCase({
            supertest,
            params: {
              cases: [
                {
                  id: theCase.id,
                  version: theCase.version,
                  status_key: 'awaiting_customer',
                  pause_reason: 'Awaiting customer',
                },
              ],
            },
            expectedHttpCode: 400,
          });
        });

        it('pauses the case, remembers where it came from, and records the reason', async () => {
          const theCase = await createCase(supertest, postCaseReq);
          const [paused] = await pause(theCase);

          expect(paused.status).to.be(CaseStatuses['in-progress']);
          expect(paused.status_key).to.be('on_hold');
          expect(paused.paused_at).to.be.a('string');
          expect(paused.pause_reason).to.be('Awaiting customer');
          expect(paused.resume_to_status_key).to.be('open');
          expect(paused.time_paused).to.be(0);

          const { userActions } = await findCaseUserActions({ supertest, caseID: theCase.id });
          const statusActions = userActions.filter(
            (action) => action.type === UserActionTypes.status
          );
          expect(statusActions).to.have.length(1);
          expect(statusActions[0].payload).to.eql({
            status: CaseStatuses['in-progress'],
            status_key: 'on_hold',
            pause_reason: 'Awaiting customer',
          });
        });

        it('adds the paused time and clears the pause on resume', async () => {
          const theCase = await createCase(supertest, postCaseReq);
          const [paused] = await pause(theCase);
          const [resumed] = await updateCase({
            supertest,
            params: {
              cases: [{ id: paused.id, version: paused.version, status_key: 'awaiting_customer' }],
            },
          });

          expect(resumed.status_key).to.be('awaiting_customer');
          expect(resumed.paused_at).to.be(null);
          expect(resumed.pause_reason).to.be(null);
          expect(resumed.resume_to_status_key).to.be(null);
          expect(resumed.time_paused).to.be.a('number');
        });

        it('closes a paused case and leaves the paused time out of its metrics', async () => {
          const theCase = await createCase(supertest, postCaseReq);
          const [paused] = await pause(theCase);
          const [closed] = await updateCase({
            supertest,
            params: {
              cases: [{ id: paused.id, version: paused.version, status: CaseStatuses.closed }],
            },
          });

          expect(closed.status).to.be(CaseStatuses.closed);
          expect(closed.paused_at).to.be(null);
          expect(closed.time_paused).to.be.a('number');
          expect(closed.duration).to.be.a('number');
          expect(closed.time_to_resolve).to.be.a('number');

          const elapsed = Math.floor(
            (new Date(closed.closed_at as string).getTime() -
              new Date(closed.created_at).getTime()) /
              1000
          );
          expect(closed.duration).to.be.lessThan(elapsed - (closed.time_paused ?? 0) + 1);
        });

        it('starts over with no paused time when a closed case is reopened', async () => {
          const theCase = await createCase(supertest, postCaseReq);
          const [paused] = await pause(theCase);
          const [closed] = await updateCase({
            supertest,
            params: {
              cases: [{ id: paused.id, version: paused.version, status: CaseStatuses.closed }],
            },
          });
          const [reopened] = await updateCase({
            supertest,
            params: {
              cases: [{ id: closed.id, version: closed.version, status: CaseStatuses.open }],
            },
          });

          expect(reopened.time_paused).to.be(0);
          expect(reopened.paused_at).to.be(null);
        });

        it('pauses several cases in one request and counts them when searching', async () => {
          const first = await createCase(supertest, postCaseReq);
          const second = await createCase(supertest, postCaseReq);
          const active = await createCase(supertest, postCaseReq);

          const patched = await updateCase({
            supertest,
            params: {
              cases: [first, second].map((item) => ({
                id: item.id,
                version: item.version,
                status_key: 'on_hold',
                pause_reason: 'Awaiting vendor',
              })),
            },
          });
          expect(patched.map((item) => item.pause_reason)).to.eql([
            'Awaiting vendor',
            'Awaiting vendor',
          ]);

          const found = await findCases({ supertest });
          expect(found.count_paused_cases).to.be(2);
          expect(found.cases.map((item) => item.id).sort()).to.eql(
            [first.id, second.id, active.id].sort()
          );

          const paused = await findCases({ supertest, query: { status_key: 'on_hold' } });
          expect(paused.cases.map((item) => item.id).sort()).to.eql([first.id, second.id].sort());
        });

        it('reports the paused duration in the lifespan metrics', async () => {
          const theCase = await createCase(supertest, postCaseReq);
          await pause(theCase);

          const metrics = await getCaseMetrics({
            supertest,
            caseId: theCase.id,
            features: [CaseMetricsFeature.LIFESPAN],
          });

          expect(metrics.lifespan?.statusInfo.pausedDuration).to.be.a('number');
        });
      });

      it('does not count paused cases when no status pauses time tracking', async () => {
        await createConfiguration(supertest, getConfigurationRequest({ overrides: { statuses } }));
        await createCase(supertest, postCaseReq);

        const found = await findCases({ supertest });
        expect(found.count_paused_cases).to.be(undefined);
      });
    });

    describe('reopen sub privilege', () => {
      const space1 = { user: superUser, space: 'space1' };
      const noReopen = { user: secOnlyNoDelete, space: 'space1' };

      beforeEach(async () => {
        await createConfiguration(
          supertestWithoutAuth,
          getConfigurationRequest({ overrides: { statuses } }),
          200,
          space1
        );
      });

      it('moves between closed statuses without it but needs it to leave the category', async () => {
        const theCase = await createCase(supertestWithoutAuth, postCaseReq, 200, space1);
        const [closed] = await updateCase({
          supertest: supertestWithoutAuth,
          params: { cases: [{ id: theCase.id, version: theCase.version, status_key: 'closed' }] },
          auth: space1,
        });

        const [resolved] = await updateCase({
          supertest: supertestWithoutAuth,
          params: { cases: [{ id: closed.id, version: closed.version, status_key: 'resolved' }] },
          auth: noReopen,
        });
        expect(resolved.status).to.be(CaseStatuses.closed);
        expect(resolved.status_key).to.be('resolved');

        await updateCase({
          supertest: supertestWithoutAuth,
          params: { cases: [{ id: resolved.id, version: resolved.version, status_key: 'open' }] },
          expectedHttpCode: 403,
          auth: noReopen,
        });
      });
    });
  });
};
