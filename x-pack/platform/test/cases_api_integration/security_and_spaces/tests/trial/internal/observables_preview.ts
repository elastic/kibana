/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type http from 'http';
import expect from '@kbn/expect';

import { ALERTING_CASES_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';
import {
  CASE_SAVED_OBJECT,
  MAX_OBSERVABLES_PER_CASE,
  OBSERVABLE_TYPE_HOSTNAME,
  OBSERVABLE_TYPE_IPV4,
} from '@kbn/cases-plugin/common/constants';
import type { Case, Observable } from '@kbn/cases-plugin/common/types/domain';
import { ObjectRemover as ActionsRemover } from '../../../../../alerting_api_integration/common/lib';
import type { FtrProviderContext } from '../../../../common/ftr_provider_context';
import { getPostCaseRequest, postCommentUserReq } from '../../../../common/lib/mock';
import type { ObservableToSeed } from '../../../../common/lib/api';
import {
  addObservable,
  bulkGetCases,
  createCase,
  createCaseWithConnector,
  createComment,
  deleteAllCaseItems,
  findCases,
  getCase,
  getServiceNowSimulationServer,
  getSOFromKibanaIndex,
  pushCase,
  resolveCase,
  searchCases,
  seedObservables,
  updateCase,
} from '../../../../common/lib/api';

const FIELD_VALUE = '10.0.0.1';
const FIRST_CREATED_AT = Date.parse('2026-11-06T09:30:00.000Z');

/** Objects created together in one request, stamped one millisecond apart in request order. */
const createdTogether = (idPrefix: string, values: string[]): ObservableToSeed[] =>
  values.map((value, index) => ({
    id: `${idPrefix}-${index}`,
    typeKey: OBSERVABLE_TYPE_HOSTNAME.key,
    value,
    createdAt: new Date(FIRST_CREATED_AT + index).toISOString(),
  }));

const values = ({ observables }: Pick<Case, 'observables'>): string[] =>
  observables.map(({ value }) => value);

export default ({ getService }: FtrProviderContext): void => {
  const es = getService('es');
  const supertest = getService('supertest');
  const actionsRemover = new ActionsRemover(supertest);

  const addFieldObservable = async (caseId: string): Promise<Case> =>
    addObservable({
      supertest,
      caseId,
      params: {
        observable: { typeKey: OBSERVABLE_TYPE_IPV4.key, value: FIELD_VALUE, description: null },
      },
    });

  const createCaseWithFieldObservable = async (): Promise<Case> => {
    const postedCase = await createCase(supertest, getPostCaseRequest());
    return addFieldObservable(postedCase.id);
  };

  const getStoredFieldObservables = async (caseId: string): Promise<Observable[]> => {
    const { body } = await getSOFromKibanaIndex({ es, soType: CASE_SAVED_OBJECT, soId: caseId });
    return body._source?.[CASE_SAVED_OBJECT].observables;
  };

  describe('observables preview in case responses', () => {
    afterEach(async () => {
      await deleteAllCaseItems(es);
    });

    it('lists the field observables first, then the oldest objects', async () => {
      const theCase = await createCaseWithFieldObservable();
      await seedObservables({
        es,
        caseId: theCase.id,
        observables: [
          {
            id: 'newest',
            typeKey: OBSERVABLE_TYPE_HOSTNAME.key,
            value: 'newest.example',
            createdAt: '2026-11-08T09:30:00.000Z',
          },
          {
            id: 'oldest',
            typeKey: OBSERVABLE_TYPE_HOSTNAME.key,
            value: 'oldest.example',
            createdAt: '2026-11-06T09:30:00.000Z',
          },
          {
            id: 'middle',
            typeKey: OBSERVABLE_TYPE_HOSTNAME.key,
            value: 'middle.example',
            createdAt: '2026-11-07T09:30:00.000Z',
          },
        ],
      });

      const retrievedCase = await getCase({ supertest, caseId: theCase.id });

      expect(values(retrievedCase)).to.eql([
        FIELD_VALUE,
        'oldest.example',
        'middle.example',
        'newest.example',
      ]);
      expect(retrievedCase.total_observables).to.be(4);
    });

    it('keeps the request order of objects created together', async () => {
      const theCase = await createCaseWithFieldObservable();
      await seedObservables({
        es,
        caseId: theCase.id,
        observables: createdTogether('together', ['zeta.example', 'alpha.example', 'mid.example']),
      });

      const retrievedCase = await getCase({ supertest, caseId: theCase.id });

      expect(values(retrievedCase)).to.eql([
        FIELD_VALUE,
        'zeta.example',
        'alpha.example',
        'mid.example',
      ]);
    });

    it('lists the oldest 50 and counts every observable of a case whose observables are all in the type', async () => {
      const postedCase = await createCase(supertest, getPostCaseRequest());
      const seeded = createdTogether(
        'all-in-type',
        Array.from({ length: MAX_OBSERVABLES_PER_CASE + 5 }, (_, index) => `host-${index}.example`)
      );
      await seedObservables({ es, caseId: postedCase.id, observables: seeded });

      const retrievedCase = await getCase({ supertest, caseId: postedCase.id });

      expect(values(retrievedCase)).to.eql(
        seeded.slice(0, MAX_OBSERVABLES_PER_CASE).map(({ value }) => value)
      );
      expect(retrievedCase.total_observables).to.be(MAX_OBSERVABLES_PER_CASE + 5);
    });

    it('lists every field observable of an imported case with more than 50 and none from the type', async () => {
      const postedCase = await createCase(supertest, getPostCaseRequest());
      const imported: Observable[] = Array.from(
        { length: MAX_OBSERVABLES_PER_CASE + 1 },
        (_, index) => ({
          id: `imported-${index}`,
          typeKey: OBSERVABLE_TYPE_IPV4.key,
          value: `10.0.1.${index}`,
          description: null,
          createdAt: '2026-11-06T09:30:00.000Z',
          updatedAt: null,
        })
      );
      await es.update({
        index: ALERTING_CASES_SAVED_OBJECT_INDEX,
        id: `${CASE_SAVED_OBJECT}:${postedCase.id}`,
        doc: { [CASE_SAVED_OBJECT]: { observables: imported, total_observables: imported.length } },
        refresh: 'wait_for',
      });
      await seedObservables({
        es,
        caseId: postedCase.id,
        observables: createdTogether('after-import', ['a.example', 'b.example']),
      });

      const retrievedCase = await getCase({ supertest, caseId: postedCase.id });

      expect(values(retrievedCase)).to.eql(imported.map(({ value }) => value));
      expect(retrievedCase.total_observables).to.be(imported.length + 2);
    });

    it('does not count objects of the case in another space', async () => {
      const theCase = await createCaseWithFieldObservable();
      await seedObservables({
        es,
        caseId: theCase.id,
        observables: createdTogether('default-space', ['default.example']),
      });
      await seedObservables({
        es,
        caseId: theCase.id,
        space: 'space2',
        observables: createdTogether('other-space', ['other.example']),
      });

      const retrievedCase = await getCase({ supertest, caseId: theCase.id });

      expect(values(retrievedCase)).to.eql([FIELD_VALUE, 'default.example']);
      expect(retrievedCase.total_observables).to.be(2);
    });

    describe('read routes', () => {
      const expected = [FIELD_VALUE, 'first.example', 'second.example'];
      let theCase: Case;

      beforeEach(async () => {
        theCase = await createCaseWithFieldObservable();
        await seedObservables({
          es,
          caseId: theCase.id,
          observables: createdTogether('read', ['first.example', 'second.example']),
        });
      });

      it('get', async () => {
        const retrievedCase = await getCase({ supertest, caseId: theCase.id });

        expect(values(retrievedCase)).to.eql(expected);
        expect(retrievedCase.total_observables).to.be(3);
      });

      it('resolve', async () => {
        const { case: resolvedCase } = await resolveCase({ supertest, caseId: theCase.id });

        expect(values(resolvedCase)).to.eql(expected);
        expect(resolvedCase.total_observables).to.be(3);
      });

      it('find', async () => {
        const { cases } = await findCases({ supertest });
        const foundCase = cases.find(({ id }) => id === theCase.id);

        expect(foundCase && values(foundCase)).to.eql(expected);
        expect(foundCase?.total_observables).to.be(3);
      });

      it('internal search', async () => {
        const { cases } = await searchCases({
          supertest,
          body: { owner: theCase.owner },
        });
        const foundCase = cases.find(({ id }) => id === theCase.id);

        expect(foundCase && values(foundCase)).to.eql(expected);
        expect(foundCase?.total_observables).to.be(3);
      });

      it('internal bulk get', async () => {
        const {
          cases: [retrievedCase],
        } = await bulkGetCases({ supertest, ids: [theCase.id] });

        expect(values(retrievedCase)).to.eql(expected);
        expect(retrievedCase.total_observables).to.be(3);
      });
    });

    describe('write routes', () => {
      const expected = [FIELD_VALUE, 'first.example', 'second.example'];
      let theCase: Case;

      beforeEach(async () => {
        theCase = await createCaseWithFieldObservable();
        await seedObservables({
          es,
          caseId: theCase.id,
          observables: createdTogether('write', ['first.example', 'second.example']),
        });
      });

      it('case update keeps the objects out of the field', async () => {
        const [updatedCase] = await updateCase({
          supertest,
          params: { cases: [{ id: theCase.id, version: theCase.version, title: 'New title' }] },
        });

        expect(values(updatedCase)).to.eql(expected);
        expect(updatedCase.total_observables).to.be(3);
        expect((await getStoredFieldObservables(theCase.id)).map(({ value }) => value)).to.eql([
          FIELD_VALUE,
        ]);
      });

      it('attachment add', async () => {
        const updatedCase = await createComment({
          supertest,
          caseId: theCase.id,
          params: postCommentUserReq,
        });

        expect(values(updatedCase)).to.eql(expected);
        expect(updatedCase.total_observables).to.be(3);
      });

      it('observable add keeps the objects out of the field', async () => {
        const updatedCase = await addObservable({
          supertest,
          caseId: theCase.id,
          params: {
            observable: { typeKey: OBSERVABLE_TYPE_IPV4.key, value: '10.0.0.2', description: null },
          },
        });

        expect(values(updatedCase)).to.eql([FIELD_VALUE, '10.0.0.2', ...expected.slice(1)]);
        expect(updatedCase.total_observables).to.be(4);
        expect((await getStoredFieldObservables(theCase.id)).map(({ value }) => value)).to.eql([
          FIELD_VALUE,
          '10.0.0.2',
        ]);
      });
    });

    describe('push', () => {
      let serviceNowSimulatorURL: string = '';
      let serviceNowServer: http.Server;

      before(async () => {
        const { server, url } = await getServiceNowSimulationServer();
        serviceNowServer = server;
        serviceNowSimulatorURL = url;
      });

      afterEach(async () => {
        await actionsRemover.removeAll();
      });

      after(async () => {
        serviceNowServer.close();
      });

      it('lists the field first, then the oldest objects, and counts both stores', async () => {
        const { postedCase, connector } = await createCaseWithConnector({
          supertest,
          serviceNowSimulatorURL,
          actionsRemover,
        });
        await addFieldObservable(postedCase.id);
        await seedObservables({
          es,
          caseId: postedCase.id,
          observables: createdTogether('push', ['first.example', 'second.example']),
        });

        const pushedCase = await pushCase({
          supertest,
          caseId: postedCase.id,
          connectorId: connector.id,
        });

        expect(values(pushedCase)).to.eql([FIELD_VALUE, 'first.example', 'second.example']);
        expect(pushedCase.total_observables).to.be(3);
      });
    });
  });
};
