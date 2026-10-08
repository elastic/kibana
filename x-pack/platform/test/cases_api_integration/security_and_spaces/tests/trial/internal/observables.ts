/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { MAX_OBSERVABLES_PER_CASE, OBSERVABLE_TYPE_IPV4 } from '@kbn/cases-plugin/common/constants';
import type { Case } from '@kbn/cases-plugin/common';
import type { ObservablesUserAction } from '@kbn/cases-plugin/common/types/domain';
import { UserActionTypes } from '@kbn/cases-plugin/common/types/domain';
import type { User } from '../../../../common/lib/authentication/types';
import { secOnly, secOnlyRead, superUser } from '../../../../common/lib/authentication/users';
import { getPostCaseRequest } from '../../../../common/lib/mock';
import {
  createCase,
  deleteAllCaseItems,
  addObservable,
  updateObservable,
  deleteObservable,
  bulkDeleteObservables,
  getCase,
  findCaseUserActions,
} from '../../../../common/lib/api';

import type { FtrProviderContext } from '../../../../common/ftr_provider_context';

export default ({ getService }: FtrProviderContext): void => {
  const es = getService('es');
  const supertest = getService('supertest');

  describe('observables', () => {
    afterEach(async () => {
      await deleteAllCaseItems(es);
    });

    describe('add observable to a case', () => {
      it('can add an observable to a case', async () => {
        const postedCase = await createCase(supertest, getPostCaseRequest());
        expect(postedCase.observables).to.eql([]);

        const newObservableData = {
          value: '127.0.0.1',
          typeKey: OBSERVABLE_TYPE_IPV4.key,
          description: '',
        };

        const updatedCase = await addObservable({
          supertest,
          caseId: postedCase.id,
          params: {
            observable: newObservableData,
          },
        });

        expect(updatedCase.observables.length).to.be.greaterThan(0);
      });

      it('can returns bad request when observable value does not pass validation', async () => {
        const postedCase = await createCase(supertest, getPostCaseRequest());
        expect(postedCase.observables).to.eql([]);

        const newObservableData = {
          value: 'not ip actually',
          typeKey: OBSERVABLE_TYPE_IPV4.key,
          description: '',
        };

        await addObservable({
          supertest,
          caseId: postedCase.id,
          params: {
            observable: newObservableData,
          },
          expectedHttpCode: 400,
        });
      });

      it('returns bad request when using unknown observable type', async () => {
        const postedCase = await createCase(supertest, getPostCaseRequest());
        expect(postedCase.observables).to.eql([]);

        const newObservableData = {
          value: 'test',
          typeKey: 'unknown type',
          description: '',
        };

        await addObservable({
          supertest,
          caseId: postedCase.id,
          params: {
            observable: newObservableData,
          },
          expectedHttpCode: 400,
        });
      });
    });

    describe('update observable', () => {
      it('updates an observable on a case', async () => {
        const postedCase = await createCase(supertest, getPostCaseRequest());

        const newObservableData = {
          value: '127.0.0.1',
          typeKey: OBSERVABLE_TYPE_IPV4.key,
          description: '',
        };

        const {
          observables: [observable],
        } = await addObservable({
          supertest,
          caseId: postedCase.id,
          params: {
            observable: newObservableData,
          },
        });

        const updatedObservable = await updateObservable({
          supertest,
          params: { observable: { description: '', value: '192.168.68.1' } },
          caseId: postedCase.id,
          observableId: observable.id as string,
        });

        expect(updatedObservable.observables[0].value).to.be('192.168.68.1');
      });

      it('returns bad request when observable value does not pass validation', async () => {
        const postedCase = await createCase(supertest, getPostCaseRequest());

        const newObservableData = {
          value: '127.0.0.1',
          typeKey: OBSERVABLE_TYPE_IPV4.key,
          description: '',
        };

        const {
          observables: [observable],
        } = await addObservable({
          supertest,
          caseId: postedCase.id,
          params: {
            observable: newObservableData,
          },
        });

        await updateObservable({
          supertest,
          params: { observable: { description: '', value: 'not ip' } },
          caseId: postedCase.id,
          observableId: observable.id as string,
          expectedHttpCode: 400,
        });
      });
    });

    describe('bulk delete observables', () => {
      const addIpv4Observable = async (
        caseId: string,
        value: string,
        auth: { user: User; space: string | null } = { user: superUser, space: null }
      ) => {
        const updatedCase = await addObservable({
          supertest,
          caseId,
          params: {
            observable: {
              value,
              typeKey: OBSERVABLE_TYPE_IPV4.key,
              description: '',
            },
          },
          auth,
        });

        return updatedCase.observables[updatedCase.observables.length - 1].id as string;
      };

      it('deletes multiple observables on a case', async () => {
        const postedCase = await createCase(supertest, getPostCaseRequest());

        const observableId1 = await addIpv4Observable(postedCase.id, '127.0.0.1');
        const observableId2 = await addIpv4Observable(postedCase.id, '127.0.0.2');
        await addIpv4Observable(postedCase.id, '127.0.0.3');

        const updatedCase = await bulkDeleteObservables({
          supertest,
          caseId: postedCase.id,
          observableIds: [observableId1, observableId2],
        });

        expect((updatedCase as Case).observables.length).to.be(1);
        expect(updatedCase.observables[0].value).to.be('127.0.0.3');
      });

      it('returns 404 when any of the requested ids does not exist', async () => {
        const postedCase = await createCase(supertest, getPostCaseRequest());
        const observableId = await addIpv4Observable(postedCase.id, '127.0.0.1');

        const body = await bulkDeleteObservables({
          supertest,
          caseId: postedCase.id,
          observableIds: [observableId, 'missing-observable-id'],
          expectedHttpCode: 404,
        });

        expect((body as { message: string }).message).to.contain('missing-observable-id');
      });

      it('returns 404 when none of the requested ids exist', async () => {
        const postedCase = await createCase(supertest, getPostCaseRequest());
        await addIpv4Observable(postedCase.id, '127.0.0.1');

        const body = await bulkDeleteObservables({
          supertest,
          caseId: postedCase.id,
          observableIds: ['missing-id-1', 'missing-id-2'],
          expectedHttpCode: 404,
        });

        const message = (body as { message: string }).message;
        expect(message).to.contain('missing-id-1');
        expect(message).to.contain('missing-id-2');
      });

      it('returns 400 when ids is an empty array', async () => {
        const postedCase = await createCase(supertest, getPostCaseRequest());

        await bulkDeleteObservables({
          supertest,
          caseId: postedCase.id,
          observableIds: [],
          expectedHttpCode: 400,
        });
      });

      it('returns 400 when ids exceeds MAX_OBSERVABLES_PER_CASE', async () => {
        const postedCase = await createCase(supertest, getPostCaseRequest());
        const ids = Array.from({ length: MAX_OBSERVABLES_PER_CASE + 1 }, (_, index) =>
          index.toString()
        );

        await bulkDeleteObservables({
          supertest,
          caseId: postedCase.id,
          observableIds: ids,
          expectedHttpCode: 400,
        });
      });

      it('creates one observables user action with the removed count', async () => {
        const postedCase = await createCase(supertest, getPostCaseRequest());
        const observableId1 = await addIpv4Observable(postedCase.id, '127.0.0.1');
        const observableId2 = await addIpv4Observable(postedCase.id, '127.0.0.2');

        await bulkDeleteObservables({
          supertest,
          caseId: postedCase.id,
          observableIds: [observableId1, observableId2],
        });

        const { userActions } = await findCaseUserActions({
          supertest,
          caseID: postedCase.id,
        });

        const deleteUserActions = userActions.filter(
          (userAction) =>
            userAction.type === UserActionTypes.observables &&
            userAction.payload?.observables?.actionType === 'delete'
        );

        expect(deleteUserActions.length).to.be(1);
        const lastDeleteUserAction = deleteUserActions[
          deleteUserActions.length - 1
        ] as ObservablesUserAction;
        expect(lastDeleteUserAction.payload.observables.count).to.be(2);
      });

      it('should not allow bulk deleting observables without permissions', async () => {
        const supertestWithoutAuth = getService('supertestWithoutAuth');
        const postedCase = await createCase(supertest, getPostCaseRequest());
        const observableId = await addIpv4Observable(postedCase.id, '127.0.0.1');

        await bulkDeleteObservables({
          supertest: supertestWithoutAuth,
          caseId: postedCase.id,
          observableIds: [observableId],
          auth: { user: secOnly, space: null },
          expectedHttpCode: 403,
        });
      });

      it('should not allow bulk deleting observables with read-only access', async () => {
        const supertestWithoutAuth = getService('supertestWithoutAuth');
        const spaceAuth = { user: superUser, space: 'space1' };
        const postedCase = await createCase(supertest, getPostCaseRequest(), 200, spaceAuth);
        const observableId = await addIpv4Observable(postedCase.id, '127.0.0.1', spaceAuth);

        await bulkDeleteObservables({
          supertest: supertestWithoutAuth,
          caseId: postedCase.id,
          observableIds: [observableId],
          auth: { user: secOnlyRead, space: 'space1' },
          expectedHttpCode: 403,
        });
      });
    });

    describe('delete observable', () => {
      it('deletes an observable on a case', async () => {
        const postedCase = await createCase(supertest, getPostCaseRequest());

        const newObservableData = {
          value: '127.0.0.1',
          typeKey: OBSERVABLE_TYPE_IPV4.key,
          description: '',
        };

        const {
          observables: [observable],
        } = await addObservable({
          supertest,
          caseId: postedCase.id,
          params: {
            observable: newObservableData,
          },
        });

        await deleteObservable({
          supertest,
          caseId: postedCase.id,
          observableId: observable.id as string,
          expectedHttpCode: 204,
        });

        const { observables } = await getCase({ supertest, caseId: postedCase.id });

        expect(observables.length).to.be(0);
      });
    });

    describe('rbac', () => {
      const supertestWithoutAuth = getService('supertestWithoutAuth');

      it('should not allow creating observables without permissions', async () => {
        const postedCase = await createCase(supertest, getPostCaseRequest());
        expect(postedCase.observables).to.eql([]);

        const newObservableData = {
          value: '127.0.0.1',
          typeKey: OBSERVABLE_TYPE_IPV4.key,
          description: '',
        };

        await addObservable({
          supertest: supertestWithoutAuth,
          caseId: postedCase.id,
          params: {
            observable: newObservableData,
          },
          auth: { user: secOnly, space: null },
          expectedHttpCode: 403,
        });
      });

      it('should not allow deleting an observable without permissions', async () => {
        const postedCase = await createCase(supertest, getPostCaseRequest());

        const newObservableData = {
          value: '127.0.0.1',
          typeKey: OBSERVABLE_TYPE_IPV4.key,
          description: '',
        };

        const {
          observables: [observable],
        } = await addObservable({
          supertest,
          caseId: postedCase.id,
          params: {
            observable: newObservableData,
          },
        });

        await deleteObservable({
          supertest: supertestWithoutAuth,
          caseId: postedCase.id,
          observableId: observable.id as string,
          auth: { user: secOnly, space: null },
          expectedHttpCode: 403,
        });
      });

      it('should not allow updating an observable without premissions', async () => {
        const postedCase = await createCase(supertest, getPostCaseRequest());

        const newObservableData = {
          value: '127.0.0.1',
          typeKey: OBSERVABLE_TYPE_IPV4.key,
          description: '',
        };

        const {
          observables: [observable],
        } = await addObservable({
          supertest,
          caseId: postedCase.id,
          params: {
            observable: newObservableData,
          },
        });

        await updateObservable({
          supertest: supertestWithoutAuth,
          params: { observable: { description: '', value: '192.168.68.1' } },
          caseId: postedCase.id,
          observableId: observable.id as string,
          auth: { user: secOnly, space: null },
          expectedHttpCode: 403,
        });
      });
    });
  });
};
