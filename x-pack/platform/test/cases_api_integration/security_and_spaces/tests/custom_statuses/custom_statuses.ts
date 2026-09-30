/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { CaseStatusesConfiguration } from '@kbn/cases-plugin/common/types/domain';
import { CaseStatuses, UserActionTypes } from '@kbn/cases-plugin/common/types/domain';
import type { FtrProviderContext } from '../../../common/ftr_provider_context';
import { postCaseReq } from '../../../common/lib/mock';
import {
  createCase,
  createConfiguration,
  deleteAllCaseItems,
  deleteConfiguration,
  findCases,
  findCaseUserActions,
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
