/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { ALERTING_CASES_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';
import {
  CASE_OBSERVABLE_SAVED_OBJECT,
  CASE_SAVED_OBJECT,
  MAX_OBSERVABLES_PER_CASE,
  OBSERVABLE_TYPE_HOSTNAME,
  OBSERVABLE_TYPE_IPV4,
} from '@kbn/cases-plugin/common/constants';
import type { Case, ObservablesUserAction } from '@kbn/cases-plugin/common/types/domain';
import { UserActionTypes } from '@kbn/cases-plugin/common/types/domain';
import type { ObservablePersistedAttributes } from '@kbn/cases-plugin/server/common/types/observable';
import type { FtrProviderContext } from '../../../../common/ftr_provider_context';
import { secOnlyRead } from '../../../../common/lib/authentication/users';
import { getPostCaseRequest } from '../../../../common/lib/mock';
import type { ObservableToSeed } from '../../../../common/lib/api';
import {
  addObservable,
  bulkDeleteObservables,
  createCase,
  deleteAllCaseItems,
  deleteObservable,
  findCaseUserActions,
  getCase,
  getSOFromKibanaIndex,
  seedObservables,
  updateObservable,
} from '../../../../common/lib/api';

const FIELD_VALUE = '10.0.0.1';
const FIRST_CREATED_AT = Date.parse('2026-11-06T09:30:00.000Z');

const typeObservables = (
  observableValues: string[],
  typeKey: string = OBSERVABLE_TYPE_HOSTNAME.key
): ObservableToSeed[] =>
  observableValues.map((value, index) => ({
    id: `type-${index + 1}`,
    typeKey,
    value,
    createdAt: new Date(FIRST_CREATED_AT + index).toISOString(),
  }));

const values = ({ observables }: Pick<Case, 'observables'>): string[] =>
  observables.map(({ value }) => value);

export default ({ getService }: FtrProviderContext): void => {
  const es = getService('es');
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');

  const addIpv4Observable = (caseId: string, value: string): Promise<Case> =>
    addObservable({
      supertest,
      caseId,
      params: { observable: { typeKey: OBSERVABLE_TYPE_IPV4.key, value, description: null } },
    });

  const createCaseWithFieldObservable = async (): Promise<Case> => {
    const postedCase = await createCase(supertest, getPostCaseRequest());
    return addIpv4Observable(postedCase.id, FIELD_VALUE);
  };

  const getStoredCase = async (caseId: string) => {
    const { body } = await getSOFromKibanaIndex({ es, soType: CASE_SAVED_OBJECT, soId: caseId });
    const { observables, total_observables: totalObservables } = body._source?.[CASE_SAVED_OBJECT];
    return {
      fieldValues: (observables as Case['observables']).map(({ value }) => value),
      totalObservables,
    };
  };

  const getStoredTypeObservable = async (id: string): Promise<ObservablePersistedAttributes> => {
    const { body } = await getSOFromKibanaIndex({
      es,
      soType: CASE_OBSERVABLE_SAVED_OBJECT,
      soId: id,
    });
    return body._source?.[CASE_OBSERVABLE_SAVED_OBJECT];
  };

  const typeObservableExists = (id: string): Promise<boolean> =>
    es.exists({
      index: ALERTING_CASES_SAVED_OBJECT_INDEX,
      id: `${CASE_OBSERVABLE_SAVED_OBJECT}:${id}`,
    });

  const getObservablesUserActions = async (caseId: string, actionType: string) => {
    const { userActions } = await findCaseUserActions({ supertest, caseID: caseId });
    return userActions.filter(
      (userAction): userAction is ObservablesUserAction =>
        userAction.type === UserActionTypes.observables &&
        userAction.payload?.observables?.actionType === actionType
    );
  };

  describe('observables in either store', () => {
    afterEach(async () => {
      await deleteAllCaseItems(es);
    });

    describe('update', () => {
      it('edits an object of the type where it is and stores a total that counts both stores', async () => {
        const theCase = await createCaseWithFieldObservable();
        await seedObservables({
          es,
          caseId: theCase.id,
          observables: typeObservables(['host-1.example.com']),
        });

        const updatedCase = await updateObservable({
          supertest,
          caseId: theCase.id,
          observableId: 'type-1',
          params: { observable: { value: 'renamed.example.com', description: 'Edited' } },
        });

        expect(values(updatedCase)).to.eql([FIELD_VALUE, 'renamed.example.com']);
        expect(updatedCase.total_observables).to.be(2);

        const updateUserActions = await getObservablesUserActions(theCase.id, 'update');
        expect(updateUserActions.length).to.be(1);
        expect(updateUserActions[0].payload.observables.count).to.be(1);

        const storedObject = await getStoredTypeObservable('type-1');
        expect(storedObject.value).to.be('renamed.example.com');
        expect(storedObject.description).to.be('Edited');
        expect(storedObject.updated_by?.username).to.be(updateUserActions[0].created_by.username);
        expect(storedObject.updated_at).to.be.a('string');

        expect(await getStoredCase(theCase.id)).to.eql({
          fieldValues: [FIELD_VALUE],
          totalObservables: 2,
        });
      });

      it('rejects a value edit of the case field that repeats an object of the type', async () => {
        const theCase = await createCaseWithFieldObservable();
        await seedObservables({
          es,
          caseId: theCase.id,
          observables: typeObservables(['10.0.0.2'], OBSERVABLE_TYPE_IPV4.key),
        });

        await updateObservable({
          supertest,
          caseId: theCase.id,
          observableId: theCase.observables[0].id,
          params: { observable: { value: '10.0.0.2', description: null } },
          expectedHttpCode: 400,
        });

        expect((await getStoredCase(theCase.id)).fieldValues).to.eql([FIELD_VALUE]);
      });

      it('rejects a value edit of an object of the type that repeats the case field', async () => {
        const theCase = await createCaseWithFieldObservable();
        await seedObservables({
          es,
          caseId: theCase.id,
          observables: typeObservables(['10.0.0.2'], OBSERVABLE_TYPE_IPV4.key),
        });

        await updateObservable({
          supertest,
          caseId: theCase.id,
          observableId: 'type-1',
          params: { observable: { value: FIELD_VALUE, description: null } },
          expectedHttpCode: 400,
        });

        expect((await getStoredTypeObservable('type-1')).value).to.be('10.0.0.2');
      });

      it('rejects a value edit of an object of the type that repeats another object', async () => {
        const theCase = await createCaseWithFieldObservable();
        await seedObservables({
          es,
          caseId: theCase.id,
          observables: typeObservables(['host-1.example.com', 'host-2.example.com']),
        });

        await updateObservable({
          supertest,
          caseId: theCase.id,
          observableId: 'type-1',
          params: { observable: { value: 'host-2.example.com', description: null } },
          expectedHttpCode: 400,
        });

        expect((await getStoredTypeObservable('type-1')).value).to.be('host-1.example.com');
      });

      it('does not edit an object of the type that belongs to another case', async () => {
        const theCase = await createCaseWithFieldObservable();
        const otherCase = await createCase(supertest, getPostCaseRequest());
        await seedObservables({
          es,
          caseId: otherCase.id,
          observables: typeObservables(['host-1.example.com']),
        });

        await updateObservable({
          supertest,
          caseId: theCase.id,
          observableId: 'type-1',
          params: { observable: { value: 'renamed.example.com', description: null } },
          expectedHttpCode: 400,
        });

        expect((await getStoredTypeObservable('type-1')).value).to.be('host-1.example.com');
      });

      it('does not let a user without update access edit an object of the type', async () => {
        const theCase = await createCaseWithFieldObservable();
        await seedObservables({
          es,
          caseId: theCase.id,
          observables: typeObservables(['host-1.example.com']),
        });

        await updateObservable({
          supertest: supertestWithoutAuth,
          caseId: theCase.id,
          observableId: 'type-1',
          params: { observable: { value: 'renamed.example.com', description: null } },
          auth: { user: secOnlyRead, space: null },
          expectedHttpCode: 403,
        });

        expect((await getStoredTypeObservable('type-1')).value).to.be('host-1.example.com');
      });
    });

    describe('add', () => {
      it('rejects a value the type holds', async () => {
        const theCase = await createCaseWithFieldObservable();
        await seedObservables({
          es,
          caseId: theCase.id,
          observables: typeObservables(['10.0.0.2'], OBSERVABLE_TYPE_IPV4.key),
        });

        await addObservable({
          supertest,
          caseId: theCase.id,
          params: {
            observable: { typeKey: OBSERVABLE_TYPE_IPV4.key, value: '10.0.0.2', description: null },
          },
          expectedHttpCode: 400,
        });

        expect((await getStoredCase(theCase.id)).fieldValues).to.eql([FIELD_VALUE]);
      });

      it('counts the type against the limit', async () => {
        const theCase = await createCaseWithFieldObservable();
        await seedObservables({
          es,
          caseId: theCase.id,
          observables: typeObservables(
            Array.from(
              { length: MAX_OBSERVABLES_PER_CASE - 1 },
              (_, index) => `host-${index}.example.com`
            )
          ),
        });

        await addObservable({
          supertest,
          caseId: theCase.id,
          params: {
            observable: { typeKey: OBSERVABLE_TYPE_IPV4.key, value: '10.0.0.2', description: null },
          },
          expectedHttpCode: 400,
        });

        expect((await getStoredCase(theCase.id)).fieldValues).to.eql([FIELD_VALUE]);
      });

      it('adds to the case field and stores a total that counts both stores', async () => {
        const theCase = await createCaseWithFieldObservable();
        await seedObservables({
          es,
          caseId: theCase.id,
          observables: typeObservables(['host-1.example.com', 'host-2.example.com']),
        });

        const updatedCase = await addIpv4Observable(theCase.id, '10.0.0.2');

        expect(updatedCase.total_observables).to.be(4);
        expect(await getStoredCase(theCase.id)).to.eql({
          fieldValues: [FIELD_VALUE, '10.0.0.2'],
          totalObservables: 4,
        });
      });
    });

    describe('delete', () => {
      it('deletes an object of the type and stores a total that counts both stores', async () => {
        const theCase = await createCaseWithFieldObservable();
        await seedObservables({
          es,
          caseId: theCase.id,
          observables: typeObservables(['host-1.example.com', 'host-2.example.com']),
        });

        await deleteObservable({
          supertest,
          caseId: theCase.id,
          observableId: 'type-1',
          expectedHttpCode: 204,
        });

        expect(await typeObservableExists('type-1')).to.be(false);
        expect(await getStoredCase(theCase.id)).to.eql({
          fieldValues: [FIELD_VALUE],
          totalObservables: 2,
        });

        const retrievedCase = await getCase({ supertest, caseId: theCase.id });
        expect(values(retrievedCase)).to.eql([FIELD_VALUE, 'host-2.example.com']);

        const deleteUserActions = await getObservablesUserActions(theCase.id, 'delete');
        expect(deleteUserActions.length).to.be(1);
        expect(deleteUserActions[0].payload.observables.count).to.be(1);
      });

      it('does not delete an object of the type that belongs to another case', async () => {
        const theCase = await createCaseWithFieldObservable();
        const otherCase = await createCase(supertest, getPostCaseRequest());
        await seedObservables({
          es,
          caseId: otherCase.id,
          observables: typeObservables(['host-1.example.com']),
        });

        await deleteObservable({
          supertest,
          caseId: theCase.id,
          observableId: 'type-1',
          expectedHttpCode: 400,
        });

        expect(await typeObservableExists('type-1')).to.be(true);
      });
    });

    describe('bulk delete', () => {
      it('deletes ids from both stores and records one user action with the count', async () => {
        const theCase = await createCaseWithFieldObservable();
        await addIpv4Observable(theCase.id, '10.0.0.2');
        await seedObservables({
          es,
          caseId: theCase.id,
          observables: typeObservables(['host-1.example.com', 'host-2.example.com']),
        });

        const updatedCase = (await bulkDeleteObservables({
          supertest,
          caseId: theCase.id,
          observableIds: [theCase.observables[0].id, 'type-1'],
        })) as Case;

        expect(values(updatedCase)).to.eql(['10.0.0.2', 'host-2.example.com']);
        expect(updatedCase.total_observables).to.be(2);
        expect(await typeObservableExists('type-1')).to.be(false);
        expect(await getStoredCase(theCase.id)).to.eql({
          fieldValues: ['10.0.0.2'],
          totalObservables: 2,
        });

        const deleteUserActions = await getObservablesUserActions(theCase.id, 'delete');
        expect(deleteUserActions.length).to.be(1);
        expect(deleteUserActions[0].payload.observables.count).to.be(2);
      });

      it('returns 404 and deletes nothing when an id is in neither store', async () => {
        const theCase = await createCaseWithFieldObservable();
        await seedObservables({
          es,
          caseId: theCase.id,
          observables: typeObservables(['host-1.example.com']),
        });

        await bulkDeleteObservables({
          supertest,
          caseId: theCase.id,
          observableIds: [theCase.observables[0].id, 'type-1', 'missing-id'],
          expectedHttpCode: 404,
        });

        expect(await typeObservableExists('type-1')).to.be(true);
        expect((await getStoredCase(theCase.id)).fieldValues).to.eql([FIELD_VALUE]);
        expect(await getObservablesUserActions(theCase.id, 'delete')).to.eql([]);
      });
    });
  });
};
