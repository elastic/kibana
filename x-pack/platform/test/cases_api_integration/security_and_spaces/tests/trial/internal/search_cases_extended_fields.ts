/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { stringify } from 'yaml';

import { INTERNAL_TEMPLATES_URL, CASE_EXTENDED_FIELDS } from '@kbn/cases-plugin/common/constants';
import type { FtrProviderContext } from '../../../../common/ftr_provider_context';
import { deleteAllCaseItems, searchCases, createCase } from '../../../../common/lib/api';
import { getPostCaseRequest } from '../../../../common/lib/mock';

export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const es = getService('es');

  describe('search_cases with extended fields', () => {
    let templateId: string;
    let templateVersion: number;

    before(async () => {
      const { body } = await supertest
        .post(INTERNAL_TEMPLATES_URL)
        .set('kbn-xsrf', 'true')
        .send({
          name: 'Incident Template',
          owner: 'securitySolutionFixture',
          definition: stringify({
            name: 'Incident Template',
            fields: [
              {
                control: 'SELECT_BASIC',
                name: 'priority',
                label: 'Priority',
                type: 'keyword',
                metadata: { options: ['Critical', 'High', 'Medium', 'Low'] },
              },
              {
                control: 'INPUT_TEXT',
                name: 'summary',
                label: 'Summary',
                type: 'keyword',
              },
              {
                control: 'DATE_PICKER',
                name: 'due_date',
                label: 'Due Date',
                type: 'date',
              },
              {
                control: 'TEXTAREA',
                name: 'remediation_notes',
                label: 'Remediation Notes',
                type: 'keyword',
              },
              {
                control: 'INPUT_NUMBER',
                name: 'score',
                label: 'Score',
                type: 'integer',
              },
            ],
          }),
          isEnabled: true,
        })
        .expect(200);

      templateId = body.templateId;
      templateVersion = body.templateVersion;
    });

    afterEach(async () => {
      await es.deleteByQuery({
        index: '.kibana_alerting_cases',
        q: 'type:cases',
        wait_for_completion: true,
        refresh: true,
        body: {},
        conflicts: 'proceed',
      });
    });

    after(async () => {
      await deleteAllCaseItems(es);
    });

    describe('ef_all_values runtime field search', () => {
      it('returns cases matching a single-word search across extended field values', async () => {
        const caseWithFields = await createCase(supertest, {
          ...getPostCaseRequest({ owner: 'securitySolutionFixture' }),
          template: { id: templateId, version: templateVersion },
          [CASE_EXTENDED_FIELDS]: {
            priority_as_keyword: 'High',
            summary_as_keyword: 'server outage investigation',
          },
        });

        await createCase(supertest, {
          ...getPostCaseRequest({ owner: 'securitySolutionFixture' }),
          template: { id: templateId, version: templateVersion },
          [CASE_EXTENDED_FIELDS]: {
            priority_as_keyword: 'Low',
            summary_as_keyword: 'routine maintenance',
          },
        });

        const cases = await searchCases({
          supertest,
          body: {
            search: 'outage',
            searchFields: ['cases.ef_all_values'],
            owner: 'securitySolutionFixture',
          },
        });

        expect(cases.total).to.eql(1);
        expect(cases.cases[0].id).to.eql(caseWithFields.id);
      });

      it('returns cases matching a multi-word search (AND semantics across tokens)', async () => {
        const caseWithBothWords = await createCase(supertest, {
          ...getPostCaseRequest({ owner: 'securitySolutionFixture' }),
          template: { id: templateId, version: templateVersion },
          [CASE_EXTENDED_FIELDS]: {
            priority_as_keyword: 'High',
            summary_as_keyword: 'server outage investigation',
          },
        });

        await createCase(supertest, {
          ...getPostCaseRequest({ owner: 'securitySolutionFixture' }),
          template: { id: templateId, version: templateVersion },
          [CASE_EXTENDED_FIELDS]: {
            priority_as_keyword: 'High',
            summary_as_keyword: 'network latency report',
          },
        });

        const cases = await searchCases({
          supertest,
          body: {
            search: 'server investigation',
            searchFields: ['cases.ef_all_values'],
            owner: 'securitySolutionFixture',
          },
        });

        expect(cases.total).to.eql(1);
        expect(cases.cases[0].id).to.eql(caseWithBothWords.id);
      });

      it('search is case-insensitive', async () => {
        const postedCase = await createCase(supertest, {
          ...getPostCaseRequest({ owner: 'securitySolutionFixture' }),
          template: { id: templateId, version: templateVersion },
          [CASE_EXTENDED_FIELDS]: {
            priority_as_keyword: 'Critical',
          },
        });

        const cases = await searchCases({
          supertest,
          body: {
            search: 'CRITICAL',
            searchFields: ['cases.ef_all_values'],
            owner: 'securitySolutionFixture',
          },
        });

        expect(cases.total).to.eql(1);
        expect(cases.cases[0].id).to.eql(postedCase.id);
      });

      it('returns no cases when search term does not match any extended field value', async () => {
        await createCase(supertest, {
          ...getPostCaseRequest({ owner: 'securitySolutionFixture' }),
          template: { id: templateId, version: templateVersion },
          [CASE_EXTENDED_FIELDS]: {
            priority_as_keyword: 'High',
            summary_as_keyword: 'server outage',
          },
        });

        const cases = await searchCases({
          supertest,
          body: {
            search: 'nonexistentvalue',
            searchFields: ['cases.ef_all_values'],
            owner: 'securitySolutionFixture',
          },
        });

        expect(cases.total).to.eql(0);
      });

      it('searches long extended-field text by complete token', async () => {
        const uniqueToken = 'runtimevalidationtoken';
        const longText = `${Array.from({ length: 101 }, (_, index) => `word${index}`).join(
          ' '
        )} ${uniqueToken}`;
        const caseWithLongText = await createCase(supertest, {
          ...getPostCaseRequest({
            owner: 'securitySolutionFixture',
            title: 'Long text extended field case',
            description: 'The unique word appears only in the template field.',
          }),
          template: { id: templateId, version: templateVersion },
          [CASE_EXTENDED_FIELDS]: {
            remediation_notes_as_keyword: longText,
          },
        });

        const completeTokenResults = await searchCases({
          supertest,
          body: {
            search: uniqueToken,
            searchFields: ['cases.ef_all_values'],
            owner: 'securitySolutionFixture',
          },
        });
        const partialTokenResults = await searchCases({
          supertest,
          body: {
            search: 'runtimevalidation',
            searchFields: ['cases.ef_all_values'],
            owner: 'securitySolutionFixture',
          },
        });

        expect(completeTokenResults.total).to.eql(1);
        expect(completeTokenResults.cases[0].id).to.eql(caseWithLongText.id);
        expect(partialTokenResults.total).to.eql(0);
      });

      it('does not include ef_all_values runtime mapping when field is not in searchFields', async () => {
        await createCase(supertest, {
          ...getPostCaseRequest({
            owner: 'securitySolutionFixture',
            title: 'unique title for ef test',
          }),
          template: { id: templateId, version: templateVersion },
          [CASE_EXTENDED_FIELDS]: {
            priority_as_keyword: 'High',
          },
        });

        const cases = await searchCases({
          supertest,
          body: {
            search: 'High',
            searchFields: ['cases.title'],
            owner: 'securitySolutionFixture',
          },
        });

        expect(cases.total).to.eql(0);
      });
    });

    describe('numeric extended-field label search', () => {
      it('does not fail when an optional numeric value is blank', async () => {
        const caseWithBlankScore = await createCase(supertest, {
          ...getPostCaseRequest({
            owner: 'securitySolutionFixture',
            title: 'Blank numeric extended field case',
            description: 'The numeric extended field remains unset.',
          }),
          template: { id: templateId, version: templateVersion },
          [CASE_EXTENDED_FIELDS]: {
            score_as_integer: '',
          },
        });

        expect(caseWithBlankScore[CASE_EXTENDED_FIELDS]).to.have.property('score_as_integer', '');

        const cases = await searchCases({
          supertest,
          body: {
            search: 'Score',
            searchFields: ['cases.title'],
            owner: 'securitySolutionFixture',
          },
        });

        expect(cases.total).to.eql(0);
      });
    });

    describe('extendedFieldFilters on flattened fields', () => {
      it('filters cases by a SELECT_BASIC extended field value', async () => {
        const highPriorityCase = await createCase(supertest, {
          ...getPostCaseRequest({ owner: 'securitySolutionFixture' }),
          template: { id: templateId, version: templateVersion },
          [CASE_EXTENDED_FIELDS]: {
            priority_as_keyword: 'High',
          },
        });

        await createCase(supertest, {
          ...getPostCaseRequest({ owner: 'securitySolutionFixture' }),
          template: { id: templateId, version: templateVersion },
          [CASE_EXTENDED_FIELDS]: {
            priority_as_keyword: 'Low',
          },
        });

        const cases = await searchCases({
          supertest,
          body: {
            extendedFieldFilters: [{ label: 'Priority', value: 'High' }],
            owner: 'securitySolutionFixture',
          },
        });

        expect(cases.total).to.eql(1);
        expect(cases.cases[0].id).to.eql(highPriorityCase.id);
      });

      it('filters cases by an INPUT_TEXT extended field value', async () => {
        const targetCase = await createCase(supertest, {
          ...getPostCaseRequest({ owner: 'securitySolutionFixture' }),
          template: { id: templateId, version: templateVersion },
          [CASE_EXTENDED_FIELDS]: {
            summary_as_keyword: 'db connection timeout',
          },
        });

        await createCase(supertest, {
          ...getPostCaseRequest({ owner: 'securitySolutionFixture' }),
          template: { id: templateId, version: templateVersion },
          [CASE_EXTENDED_FIELDS]: {
            summary_as_keyword: 'routine check',
          },
        });

        const cases = await searchCases({
          supertest,
          body: {
            extendedFieldFilters: [{ label: 'Summary', value: 'db connection timeout' }],
            owner: 'securitySolutionFixture',
          },
        });

        expect(cases.total).to.eql(1);
        expect(cases.cases[0].id).to.eql(targetCase.id);
      });

      it('filters cases by a DATE_PICKER extended field using date range', async () => {
        const caseWithDate = await createCase(supertest, {
          ...getPostCaseRequest({ owner: 'securitySolutionFixture' }),
          template: { id: templateId, version: templateVersion },
          [CASE_EXTENDED_FIELDS]: {
            due_date_as_date: '2024-06-15T00:00:00.000Z',
          },
        });

        await createCase(supertest, {
          ...getPostCaseRequest({ owner: 'securitySolutionFixture' }),
          template: { id: templateId, version: templateVersion },
          [CASE_EXTENDED_FIELDS]: {
            due_date_as_date: '2024-12-01T00:00:00.000Z',
          },
        });

        const cases = await searchCases({
          supertest,
          body: {
            extendedFieldFilters: [{ label: 'Due Date', value: '2024-06-15' }],
            owner: 'securitySolutionFixture',
          },
        });

        expect(cases.total).to.eql(1);
        expect(cases.cases[0].id).to.eql(caseWithDate.id);
      });

      it('combines extended field filter with free-text search', async () => {
        const targetCase = await createCase(supertest, {
          ...getPostCaseRequest({
            owner: 'securitySolutionFixture',
            title: 'network incident alpha',
          }),
          template: { id: templateId, version: templateVersion },
          [CASE_EXTENDED_FIELDS]: {
            priority_as_keyword: 'Critical',
          },
        });

        await createCase(supertest, {
          ...getPostCaseRequest({
            owner: 'securitySolutionFixture',
            title: 'network incident beta',
          }),
          template: { id: templateId, version: templateVersion },
          [CASE_EXTENDED_FIELDS]: {
            priority_as_keyword: 'Low',
          },
        });

        await createCase(supertest, {
          ...getPostCaseRequest({
            owner: 'securitySolutionFixture',
            title: 'unrelated case',
          }),
          template: { id: templateId, version: templateVersion },
          [CASE_EXTENDED_FIELDS]: {
            priority_as_keyword: 'Critical',
          },
        });

        const cases = await searchCases({
          supertest,
          body: {
            search: 'network incident alpha',
            searchFields: ['cases.title'],
            extendedFieldFilters: [{ label: 'Priority', value: 'Critical' }],
            owner: 'securitySolutionFixture',
          },
        });

        expect(cases.total).to.eql(1);
        expect(cases.cases[0].id).to.eql(targetCase.id);
      });

      it('returns no cases when extended field filter value does not match', async () => {
        await createCase(supertest, {
          ...getPostCaseRequest({ owner: 'securitySolutionFixture' }),
          template: { id: templateId, version: templateVersion },
          [CASE_EXTENDED_FIELDS]: {
            priority_as_keyword: 'High',
          },
        });

        const cases = await searchCases({
          supertest,
          body: {
            extendedFieldFilters: [{ label: 'Priority', value: 'Critical' }],
            owner: 'securitySolutionFixture',
          },
        });

        expect(cases.total).to.eql(0);
      });
    });

    describe('extendedFieldFilters on global TOGGLE fields', () => {
      const FIELD_DEFINITIONS_URL = '/internal/cases/field_definitions';

      before(async () => {
        await supertest
          .post(FIELD_DEFINITIONS_URL)
          .set('kbn-xsrf', 'true')
          .send({
            name: 'escalate',
            owner: 'securitySolutionFixture',
            isGlobal: true,
            definition: stringify({
              name: 'escalate',
              label: 'Escalate',
              control: 'TOGGLE',
              type: 'boolean',
            }),
          })
          .expect(200);
      });

      it('filters cases by a global TOGGLE field value', async () => {
        const onCase = await createCase(supertest, {
          ...getPostCaseRequest({ owner: 'securitySolutionFixture' }),
          [CASE_EXTENDED_FIELDS]: {
            escalate_as_boolean: 'true',
          },
        });

        await createCase(supertest, {
          ...getPostCaseRequest({ owner: 'securitySolutionFixture' }),
          [CASE_EXTENDED_FIELDS]: {
            escalate_as_boolean: 'false',
          },
        });

        const cases = await searchCases({
          supertest,
          body: {
            extendedFieldFilters: [{ label: 'Escalate', value: 'true' }],
            owner: 'securitySolutionFixture',
          },
        });

        expect(cases.total).to.eql(1);
        expect(cases.cases[0].id).to.eql(onCase.id);
      });

      it('ORs multiple values for the same toggle label', async () => {
        const onCase = await createCase(supertest, {
          ...getPostCaseRequest({ owner: 'securitySolutionFixture' }),
          [CASE_EXTENDED_FIELDS]: {
            escalate_as_boolean: 'true',
          },
        });

        const offCase = await createCase(supertest, {
          ...getPostCaseRequest({ owner: 'securitySolutionFixture' }),
          [CASE_EXTENDED_FIELDS]: {
            escalate_as_boolean: 'false',
          },
        });

        const cases = await searchCases({
          supertest,
          body: {
            extendedFieldFilters: [
              { label: 'Escalate', value: 'true' },
              { label: 'Escalate', value: 'false' },
            ],
            owner: 'securitySolutionFixture',
          },
        });

        expect(cases.total).to.eql(2);
        expect(cases.cases.map((c: { id: string }) => c.id).sort()).to.eql(
          [onCase.id, offCase.id].sort()
        );
      });
    });
  });
};
