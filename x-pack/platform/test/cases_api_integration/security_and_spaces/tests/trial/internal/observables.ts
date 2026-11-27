/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { ALERTING_CASES_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';
import {
  CASE_SAVED_OBJECT,
  MAX_OBSERVABLE_DESCRIPTION_LENGTH,
  MAX_OBSERVABLE_VALUE_LENGTH,
  MAX_OBSERVABLES_PER_CASE,
  OBSERVABLE_TYPE_HOSTNAME,
  OBSERVABLE_TYPE_IPV4,
} from '@kbn/cases-plugin/common/constants';
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
  getSOFromKibanaIndex,
  updateCase,
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

      it('adds an observable whose value and description are at the maximum length', async () => {
        const postedCase = await createCase(supertest, getPostCaseRequest());

        const updatedCase = await addObservable({
          supertest,
          caseId: postedCase.id,
          params: {
            observable: {
              value: 'h'.repeat(MAX_OBSERVABLE_VALUE_LENGTH),
              typeKey: OBSERVABLE_TYPE_HOSTNAME.key,
              description: 'd'.repeat(MAX_OBSERVABLE_DESCRIPTION_LENGTH),
            },
          },
        });

        expect(updatedCase.observables.length).to.be(1);
      });

      it('returns bad request when the value or description exceeds the maximum length', async () => {
        const postedCase = await createCase(supertest, getPostCaseRequest());

        await addObservable({
          supertest,
          caseId: postedCase.id,
          params: {
            observable: {
              value: 'h'.repeat(MAX_OBSERVABLE_VALUE_LENGTH + 1),
              typeKey: OBSERVABLE_TYPE_HOSTNAME.key,
              description: null,
            },
          },
          expectedHttpCode: 400,
        });

        await addObservable({
          supertest,
          caseId: postedCase.id,
          params: {
            observable: {
              value: 'host-1',
              typeKey: OBSERVABLE_TYPE_HOSTNAME.key,
              description: 'd'.repeat(MAX_OBSERVABLE_DESCRIPTION_LENGTH + 1),
            },
          },
          expectedHttpCode: 400,
        });

        const { observables } = await getCase({ supertest, caseId: postedCase.id });
        expect(observables).to.eql([]);
      });

      it('keeps every observable when they are added in parallel', async () => {
        const postedCase = await createCase(supertest, getPostCaseRequest());
        const values = ['10.0.0.1', '10.0.0.2', '10.0.0.3'];

        // Each version conflict has one winner, so three writers always finish within the three write attempts.
        await Promise.all(
          values.map((value) =>
            addObservable({
              supertest,
              caseId: postedCase.id,
              params: {
                observable: { value, typeKey: OBSERVABLE_TYPE_IPV4.key, description: null },
              },
            })
          )
        );

        const { observables } = await getCase({ supertest, caseId: postedCase.id });
        expect(observables.map(({ value }) => value).sort()).to.eql(values);
      });
    });

    describe('stored observable count', () => {
      it('keeps total_observables when a case update does not touch observables', async () => {
        const postedCase = await createCase(supertest, getPostCaseRequest());

        await addObservable({
          supertest,
          caseId: postedCase.id,
          params: {
            observable: { value: '10.0.0.1', typeKey: OBSERVABLE_TYPE_IPV4.key, description: null },
          },
        });
        const caseWithObservables = await addObservable({
          supertest,
          caseId: postedCase.id,
          params: {
            observable: { value: '10.0.0.2', typeKey: OBSERVABLE_TYPE_IPV4.key, description: null },
          },
        });

        await updateCase({
          supertest,
          params: {
            cases: [
              {
                id: caseWithObservables.id,
                version: caseWithObservables.version,
                title: 'new title',
              },
            ],
          },
        });

        const { body } = await getSOFromKibanaIndex({
          es,
          soType: CASE_SAVED_OBJECT,
          soId: postedCase.id,
        });
        expect(body._source?.[CASE_SAVED_OBJECT].total_observables).to.be(2);
      });
    });

    describe('observable stored before the length bounds', () => {
      const legacyValue = 'h'.repeat(MAX_OBSERVABLE_VALUE_LENGTH + 1);

      const addLegacyObservable = async () => {
        const postedCase = await createCase(supertest, getPostCaseRequest());
        const {
          observables: [observable],
        } = await addObservable({
          supertest,
          caseId: postedCase.id,
          params: {
            observable: {
              value: 'host-1',
              typeKey: OBSERVABLE_TYPE_HOSTNAME.key,
              description: null,
            },
          },
        });

        // The request bounds reject this value, so it is written straight to the saved object.
        await es.update({
          index: ALERTING_CASES_SAVED_OBJECT_INDEX,
          id: `${CASE_SAVED_OBJECT}:${postedCase.id}`,
          doc: { [CASE_SAVED_OBJECT]: { observables: [{ ...observable, value: legacyValue }] } },
          refresh: true,
        });

        return { caseId: postedCase.id, observableId: observable.id };
      };

      it('edits the description and keeps the over-length value', async () => {
        const { caseId, observableId } = await addLegacyObservable();

        const updatedCase = await updateObservable({
          supertest,
          params: { observable: { value: legacyValue, description: 'triaged' } },
          caseId,
          observableId,
        });

        expect(updatedCase.observables[0].value).to.be(legacyValue);
        expect(updatedCase.observables[0].description).to.be('triaged');
      });

      it('deletes the over-length observable', async () => {
        const { caseId, observableId } = await addLegacyObservable();

        await deleteObservable({ supertest, caseId, observableId, expectedHttpCode: 204 });

        const { observables } = await getCase({ supertest, caseId });
        expect(observables.length).to.be(0);
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

      it('returns bad request when an edit changes the value to one over the maximum length', async () => {
        const postedCase = await createCase(supertest, getPostCaseRequest());

        const {
          observables: [observable],
        } = await addObservable({
          supertest,
          caseId: postedCase.id,
          params: {
            observable: {
              value: 'host-1',
              typeKey: OBSERVABLE_TYPE_HOSTNAME.key,
              description: null,
            },
          },
        });

        await updateObservable({
          supertest,
          params: {
            observable: { value: 'h'.repeat(MAX_OBSERVABLE_VALUE_LENGTH + 1), description: null },
          },
          caseId: postedCase.id,
          observableId: observable.id,
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

        const typedCase = updatedCase as Case;
        expect(typedCase.observables.length).to.be(1);
        expect(typedCase.observables[0].value).to.be('127.0.0.3');
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
