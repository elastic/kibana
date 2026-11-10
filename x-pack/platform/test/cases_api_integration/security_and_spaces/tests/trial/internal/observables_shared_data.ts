/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { v4 as uuidv4 } from 'uuid';
import { ALERTING_CASES_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';
import { OBSERVABLE_TYPE_HOSTNAME, OBSERVABLE_TYPE_IPV4 } from '@kbn/cases-plugin/common/constants';
import type { Observable } from '@kbn/cases-plugin/common/types/domain';
import type { ObservablePost } from '@kbn/cases-plugin/common/types/api';
import { superUser } from '../../../../common/lib/authentication/users';
import { getPostCaseRequest } from '../../../../common/lib/mock';
import {
  addObservable,
  bulkCreateObservables,
  createCase,
  deleteAllCaseItems,
  findObservables,
  updateObservable,
} from '../../../../common/lib/api';
import type { FtrProviderContext } from '../../../../common/ftr_provider_context';

const ipv4 = (last: number): ObservablePost => ({
  typeKey: OBSERVABLE_TYPE_IPV4.key,
  value: `10.0.0.${last}`,
  description: null,
});

const hostname = (value: string): ObservablePost => ({
  typeKey: OBSERVABLE_TYPE_HOSTNAME.key,
  value,
  description: null,
});

export default ({ getService }: FtrProviderContext): void => {
  const es = getService('es');
  const supertest = getService('supertest');

  /** Observables already in the case field, the way an earlier release stored them. */
  const seedFieldObservables = async (caseId: string, observables: ObservablePost[]) => {
    const now = new Date().toISOString();
    const fieldObservables: Observable[] = observables.map((observable) => ({
      ...observable,
      description: observable.description ?? null,
      id: uuidv4(),
      createdAt: now,
      updatedAt: null,
    }));

    await es.update({
      index: ALERTING_CASES_SAVED_OBJECT_INDEX,
      id: `cases:${caseId}`,
      doc: { cases: { observables: fieldObservables, total_observables: fieldObservables.length } },
      refresh: true,
    });

    return fieldObservables;
  };

  const metadataOf = async (
    caseId: string,
    value: string,
    space: string | null = null
  ): Promise<Record<string, string> | undefined> => {
    const { observables } = await findObservables({
      supertest,
      caseId,
      params: { perPage: 100 },
      auth: { user: superUser, space },
    });
    return observables.find((observable) => observable.value === value)?.metadata;
  };

  describe('shared observable data', () => {
    afterEach(async () => {
      await deleteAllCaseItems(es);
    });

    describe('sharing', () => {
      it('shows metadata set in one case in every case of the space and owner holding the value, in either store', async () => {
        const caseA = await createCase(supertest, getPostCaseRequest());
        const caseB = await createCase(supertest, getPostCaseRequest());
        await seedFieldObservables(caseB.id, [ipv4(8)]);

        await addObservable({
          supertest,
          caseId: caseA.id,
          params: { observable: { ...ipv4(8), metadata: { triage: 'confirmed' } } },
        });

        expect(await metadataOf(caseA.id, ipv4(8).value)).to.eql({ triage: 'confirmed' });
        expect(await metadataOf(caseB.id, ipv4(8).value)).to.eql({ triage: 'confirmed' });
      });

      it('does not share metadata with another owner or another space', async () => {
        const source = await createCase(supertest, getPostCaseRequest());
        const otherOwner = await createCase(
          supertest,
          getPostCaseRequest({ owner: 'observabilityFixture' })
        );
        const otherSpace = await createCase(supertest, getPostCaseRequest(), 200, {
          user: superUser,
          space: 'space1',
        });

        await addObservable({
          supertest,
          caseId: source.id,
          params: { observable: { ...ipv4(8), metadata: { triage: 'confirmed' } } },
        });
        await addObservable({ supertest, caseId: otherOwner.id, params: { observable: ipv4(8) } });
        await addObservable({
          supertest,
          caseId: otherSpace.id,
          params: { observable: ipv4(8) },
          auth: { user: superUser, space: 'space1' },
        });

        expect(await metadataOf(otherOwner.id, ipv4(8).value)).to.be(undefined);
        expect(await metadataOf(otherSpace.id, ipv4(8).value, 'space1')).to.be(undefined);
      });
    });

    describe('writes', () => {
      it('merges on add, and keeps, replaces or clears on edit', async () => {
        const caseA = await createCase(supertest, getPostCaseRequest());
        const caseB = await createCase(supertest, getPostCaseRequest());

        await addObservable({
          supertest,
          caseId: caseA.id,
          params: { observable: { ...ipv4(8), metadata: { triage: 'new' } } },
        });
        const {
          added: [observableInB],
        } = await bulkCreateObservables({
          supertest,
          caseId: caseB.id,
          params: { observables: [{ ...ipv4(8), metadata: { asset_owner: 'payments' } }] },
        });

        expect(await metadataOf(caseA.id, ipv4(8).value)).to.eql({
          triage: 'new',
          asset_owner: 'payments',
        });

        await updateObservable({
          supertest,
          caseId: caseB.id,
          observableId: observableInB.id,
          params: { observable: { value: ipv4(8).value, description: 'edited' } },
        });
        expect(await metadataOf(caseA.id, ipv4(8).value)).to.eql({
          triage: 'new',
          asset_owner: 'payments',
        });

        await updateObservable({
          supertest,
          caseId: caseB.id,
          observableId: observableInB.id,
          params: {
            observable: { value: ipv4(8).value, description: null, metadata: { triage: 'benign' } },
          },
        });
        expect(await metadataOf(caseA.id, ipv4(8).value)).to.eql({ triage: 'benign' });

        await updateObservable({
          supertest,
          caseId: caseB.id,
          observableId: observableInB.id,
          params: { observable: { value: ipv4(8).value, description: null, metadata: null } },
        });
        expect(await metadataOf(caseA.id, ipv4(8).value)).to.be(undefined);
      });

      it('sets the metadata of an observable in the case field', async () => {
        const theCase = await createCase(supertest, getPostCaseRequest());
        const [fieldObservable] = await seedFieldObservables(theCase.id, [ipv4(8)]);

        await updateObservable({
          supertest,
          caseId: theCase.id,
          observableId: fieldObservable.id,
          params: {
            observable: { value: ipv4(8).value, description: null, metadata: { triage: 'x' } },
          },
        });

        expect(await metadataOf(theCase.id, ipv4(8).value)).to.eql({ triage: 'x' });
      });

      it('rejects metadata out of bounds', async () => {
        const theCase = await createCase(supertest, getPostCaseRequest());
        const tooMany = Object.fromEntries(
          Array.from({ length: 21 }, (_, i) => [`key-${i}`, 'value'])
        );

        for (const metadata of [tooMany, { 'tri*': 'x' }, { triage: 'v'.repeat(1025) }]) {
          await addObservable({
            supertest,
            caseId: theCase.id,
            params: { observable: { ...ipv4(8), metadata } },
            expectedHttpCode: 400,
          });
        }
      });
    });

    describe('list filters', () => {
      it('filters by a value ignoring case, a value prefix and a key, in both stores', async () => {
        const theCase = await createCase(supertest, getPostCaseRequest());
        const [fieldObservable] = await seedFieldObservables(theCase.id, [hostname('web-01')]);
        await bulkCreateObservables({
          supertest,
          caseId: theCase.id,
          params: {
            observables: [
              { ...ipv4(1), metadata: { triage: 'Confirmed', asset_owner: 'payments-team' } },
              { ...ipv4(2), metadata: { triage: 'benign' } },
              ipv4(3),
            ],
          },
        });
        await updateObservable({
          supertest,
          caseId: theCase.id,
          observableId: fieldObservable.id,
          params: {
            observable: {
              value: 'web-01',
              description: null,
              metadata: { triage: 'confirmed', asset_owner: 'web' },
            },
          },
        });

        const valuesFor = async (
          metadata: Array<{ key: string; value?: string; prefix?: string }>
        ) =>
          (
            await findObservables({ supertest, caseId: theCase.id, params: { metadata } })
          ).observables
            .map(({ value }) => value)
            .sort();

        expect(await valuesFor([{ key: 'triage', value: 'CONFIRMED' }])).to.eql([
          '10.0.0.1',
          'web-01',
        ]);
        expect(await valuesFor([{ key: 'asset_owner', prefix: 'pay' }])).to.eql(['10.0.0.1']);
        expect(await valuesFor([{ key: 'triage' }])).to.eql(['10.0.0.1', '10.0.0.2', 'web-01']);
        expect(
          await valuesFor([
            { key: 'triage', value: 'confirmed' },
            { key: 'asset_owner', value: 'web' },
          ])
        ).to.eql(['web-01']);
        expect(await valuesFor([{ key: 'missing' }])).to.eql([]);
      });
    });

    describe('export and import', () => {
      it('keeps the metadata of a case imported into another space, found by value', async () => {
        const theCase = await createCase(supertest, getPostCaseRequest());
        await addObservable({
          supertest,
          caseId: theCase.id,
          params: { observable: { ...ipv4(8), metadata: { triage: 'confirmed' } } },
        });

        const { text } = await supertest
          .post('/api/saved_objects/_export')
          .send({ type: ['cases'], excludeExportDetails: true, includeReferencesDeep: true })
          .set('kbn-xsrf', 'true')
          .expect(200);

        expect(text).to.contain('"type":"cases-observable-shared"');

        const { body: importResult } = await supertest
          .post('/s/space2/api/saved_objects/_import?createNewCopies=true')
          .set('kbn-xsrf', 'true')
          .attach('file', Buffer.from(text), 'cases.ndjson')
          .expect(200);

        const importedCaseId = importResult.successResults.find(
          ({ type }: { type: string }) => type === 'cases'
        ).destinationId;

        expect(await metadataOf(importedCaseId, ipv4(8).value, 'space2')).to.eql({
          triage: 'confirmed',
        });
      });
    });
  });
};
