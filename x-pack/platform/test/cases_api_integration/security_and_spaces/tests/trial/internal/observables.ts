/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import {
  MAX_OBSERVABLES_PER_CASE,
  OBSERVABLE_TYPE_HOSTNAME,
  OBSERVABLE_TYPE_IPV4,
} from '@kbn/cases-plugin/common/constants';
import { ALERTING_CASES_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';
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
  bulkCreateObservables,
  findObservables,
  createComment,
  deleteCases,
  findAttachmentsV2,
  getAllComments,
} from '../../../../common/lib/api';
import { postCommentUserReq } from '../../../../common/lib/mock';

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

    describe('observables stored as attachments', () => {
      const ipv4 = (value: string) => ({
        typeKey: OBSERVABLE_TYPE_IPV4.key,
        value,
        description: null,
      });
      const ipv4Range = (count: number) =>
        Array.from({ length: count }, (_, index) =>
          ipv4(`10.0.${Math.floor(index / 256)}.${index % 256}`)
        );

      const countStoredObservables = async (caseId: string): Promise<number> => {
        await es.indices.refresh({ index: ALERTING_CASES_SAVED_OBJECT_INDEX });
        const { count } = await es.count({
          index: ALERTING_CASES_SAVED_OBJECT_INDEX,
          query: {
            bool: {
              filter: [
                { term: { 'cases-attachments.type': 'observable' } },
                { nested: { path: 'references', query: { term: { 'references.id': caseId } } } },
              ],
            },
          },
        });
        return count;
      };

      it('bulk creates observables and reports duplicates', async () => {
        const postedCase = await createCase(supertest, getPostCaseRequest());

        const first = await bulkCreateObservables({
          supertest,
          caseId: postedCase.id,
          params: { observables: [...ipv4Range(3), ipv4('10.0.0.0')] },
        });
        const second = await bulkCreateObservables({
          supertest,
          caseId: postedCase.id,
          params: { observables: ipv4Range(5) },
        });

        expect(first).to.eql({ added: 3, duplicates: 1, over_cap: 0, total_observables: 3 });
        expect(second).to.eql({ added: 2, duplicates: 3, over_cap: 0, total_observables: 5 });
        expect(await countStoredObservables(postedCase.id)).to.be(5);
      });

      it('keeps the case response to a preview of the first observables and an accurate total', async () => {
        const postedCase = await createCase(supertest, getPostCaseRequest());
        await bulkCreateObservables({
          supertest,
          caseId: postedCase.id,
          params: { observables: ipv4Range(MAX_OBSERVABLES_PER_CASE + 10) },
        });

        const theCase = await getCase({ supertest, caseId: postedCase.id });

        expect(theCase.total_observables).to.be(MAX_OBSERVABLES_PER_CASE + 10);
        expect(theCase.observables.length).to.be(MAX_OBSERVABLES_PER_CASE);
      });

      it('pages through every observable with a cursor', async () => {
        const postedCase = await createCase(supertest, getPostCaseRequest());
        await bulkCreateObservables({
          supertest,
          caseId: postedCase.id,
          params: { observables: ipv4Range(25) },
        });

        const seen = new Set<string>();
        let cursor: string | undefined;
        let pages = 0;
        do {
          const page = await findObservables({
            supertest,
            caseId: postedCase.id,
            params: { perPage: 10, sortField: 'value', ...(cursor != null && { cursor }) },
          });
          expect(page.total).to.be(25);
          page.observables.forEach(({ id }) => seen.add(id));
          cursor = page.cursor;
          pages += 1;
        } while (cursor != null && pages < 10);

        expect(seen.size).to.be(25);
        expect(pages).to.be(3);
      });

      it('sorts, filters by type and searches values case-insensitively', async () => {
        const postedCase = await createCase(supertest, getPostCaseRequest());
        await bulkCreateObservables({
          supertest,
          caseId: postedCase.id,
          params: {
            observables: [
              ...ipv4Range(3),
              {
                typeKey: OBSERVABLE_TYPE_HOSTNAME.key,
                value: 'Web-01.example.com',
                description: null,
              },
              {
                typeKey: OBSERVABLE_TYPE_HOSTNAME.key,
                value: 'db-01.example.com',
                description: null,
              },
            ],
          },
        });

        const byValueDesc = await findObservables({
          supertest,
          caseId: postedCase.id,
          params: { sortField: 'value', sortOrder: 'desc' },
        });
        const hostnames = await findObservables({
          supertest,
          caseId: postedCase.id,
          params: { typeKeys: [OBSERVABLE_TYPE_HOSTNAME.key] },
        });
        const search = await findObservables({
          supertest,
          caseId: postedCase.id,
          params: { search: 'web-01' },
        });

        expect(byValueDesc.observables.map(({ value }) => value)).to.eql([
          'db-01.example.com',
          'Web-01.example.com',
          '10.0.0.2',
          '10.0.0.1',
          '10.0.0.0',
        ]);
        expect(hostnames.total).to.be(2);
        expect(search.observables.map(({ value }) => value)).to.eql(['Web-01.example.com']);
      });

      it('leaves observables out of the case attachments unless asked for by type', async () => {
        const postedCase = await createCase(supertest, getPostCaseRequest());
        await createComment({ supertest, caseId: postedCase.id, params: postCommentUserReq });
        await bulkCreateObservables({
          supertest,
          caseId: postedCase.id,
          params: { observables: ipv4Range(3) },
        });

        const attachments = await findAttachmentsV2({ supertest, caseId: postedCase.id });
        const observableAttachments = await findAttachmentsV2({
          supertest,
          caseId: postedCase.id,
          query: { type: 'observable' },
        });
        const allComments = await getAllComments({ supertest, caseId: postedCase.id });

        expect(attachments.total).to.be(1);
        expect(observableAttachments.total).to.be(3);
        expect(allComments.length).to.be(1);
      });

      it('refuses observables on the generic attachment API', async () => {
        const postedCase = await createCase(supertest, getPostCaseRequest());

        await createComment({
          supertest,
          caseId: postedCase.id,
          params: {
            type: 'observable',
            owner: postedCase.owner,
            data: { typeKey: OBSERVABLE_TYPE_IPV4.key, value: '10.0.0.1', description: null },
          },
          expectedHttpCode: 400,
        });
      });

      it('gives an observable a new id when its value changes', async () => {
        const postedCase = await createCase(supertest, getPostCaseRequest());
        const {
          observables: [original],
        } = await addObservable({
          supertest,
          caseId: postedCase.id,
          params: { observable: ipv4('10.0.0.1') },
        });

        const {
          observables: [updated],
        } = await updateObservable({
          supertest,
          caseId: postedCase.id,
          observableId: original.id,
          params: { observable: { value: '10.0.0.2', description: null } },
        });

        expect(updated.value).to.be('10.0.0.2');
        expect(updated.id).not.to.be(original.id);
        await deleteObservable({
          supertest,
          caseId: postedCase.id,
          observableId: original.id,
          expectedHttpCode: 400,
        });
      });

      it('does not delete an observable through another case', async () => {
        const firstCase = await createCase(supertest, getPostCaseRequest());
        const secondCase = await createCase(supertest, getPostCaseRequest());
        const {
          observables: [observable],
        } = await addObservable({
          supertest,
          caseId: firstCase.id,
          params: { observable: ipv4('10.0.0.1') },
        });

        await bulkDeleteObservables({
          supertest,
          caseId: secondCase.id,
          observableIds: [observable.id],
          expectedHttpCode: 404,
        });
        expect(await countStoredObservables(firstCase.id)).to.be(1);
      });

      it('deletes the observables of a deleted case', async () => {
        const postedCase = await createCase(supertest, getPostCaseRequest());
        await bulkCreateObservables({
          supertest,
          caseId: postedCase.id,
          params: { observables: ipv4Range(1_000) },
        });
        await bulkCreateObservables({
          supertest,
          caseId: postedCase.id,
          params: { observables: ipv4Range(1_200).slice(1_000) },
        });
        expect(await countStoredObservables(postedCase.id)).to.be(1_200);

        await deleteCases({ supertest, caseIDs: [postedCase.id] });

        expect(await countStoredObservables(postedCase.id)).to.be(0);
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
