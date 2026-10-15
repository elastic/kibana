/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { stringify as yamlStringify } from 'yaml';
import expect from '@kbn/expect';
import type { SavedObject } from '@kbn/core/server';
import {
  CASE_SAVED_OBJECT,
  CASE_TEMPLATE_SAVED_OBJECT,
  CASE_FIELD_DEFINITION_SAVED_OBJECT,
} from '@kbn/cases-plugin/common/constants';
import { deleteAllCaseItems, createCase, getSpaceUrlPrefix } from '../../../../common/lib/api';
import { getPostCaseRequest } from '../../../../common/lib/mock';
import type { FtrProviderContext } from '../../../../common/ftr_provider_context';

const TEMPLATES_URL = '/internal/cases/templates';
const FIELD_DEFINITIONS_URL = '/internal/cases/field_definitions';

const buildFieldDefinitionBody = (overrides: Record<string, unknown> = {}) => ({
  name: 'incident_type',
  owner: 'securitySolutionFixture',
  definition: yamlStringify({
    name: 'incident_type',
    control: 'INPUT_TEXT',
    label: 'Incident Type',
    type: 'keyword',
  }),
  ...overrides,
});

const buildGlobalFieldDefinitionBody = (overrides: Record<string, unknown> = {}) => ({
  name: 'environment',
  owner: 'securitySolutionFixture',
  definition: yamlStringify({
    name: 'environment',
    control: 'SELECT_BASIC',
    label: 'Environment',
    type: 'keyword',
    metadata: { options: ['prod', 'staging', 'dev'] },
  }),
  isGlobal: true,
  ...overrides,
});

const buildTemplateBody = (overrides: Record<string, unknown> = {}) => ({
  name: 'Security Incident Template',
  owner: 'securitySolutionFixture',
  definition: yamlStringify({
    name: 'Security Incident',
    // $ref to the field library entry
    fields: [{ $ref: 'incident_type' }],
  }),
  isEnabled: true,
  ...overrides,
});

const ndjsonToObjects = (text: string): Array<SavedObject<Record<string, unknown>>> =>
  text
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line));

export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const es = getService('es');

  describe('import and export cases with Templates v2', () => {
    afterEach(async () => {
      await deleteAllCaseItems(es);
    });

    it('exports a case with its referenced template and field definitions', async () => {
      // Create a $ref field definition (used by the template)
      await supertest
        .post(`${getSpaceUrlPrefix('default')}${FIELD_DEFINITIONS_URL}`)
        .set('kbn-xsrf', 'true')
        .send(buildFieldDefinitionBody())
        .expect(200);

      // Create a global field definition (should always be bundled, regardless of template reference)
      await supertest
        .post(`${getSpaceUrlPrefix('default')}${FIELD_DEFINITIONS_URL}`)
        .set('kbn-xsrf', 'true')
        .send(buildGlobalFieldDefinitionBody())
        .expect(200);

      // Create the template that $refs the field definition
      const { body: template } = await supertest
        .post(`${getSpaceUrlPrefix('default')}${TEMPLATES_URL}`)
        .set('kbn-xsrf', 'true')
        .send(buildTemplateBody())
        .expect(200);

      // Create a case that references the template
      await createCase(supertest, {
        ...getPostCaseRequest({ owner: 'securitySolutionFixture' }),
        template: { id: template.templateId, version: template.templateVersion },
      });

      // Export all cases
      const { text } = await supertest
        .post(`/api/saved_objects/_export`)
        .send({
          type: ['cases'],
          excludeExportDetails: true,
          includeReferencesDeep: true,
        })
        .set('kbn-xsrf', 'true');

      const objects = ndjsonToObjects(text);

      // Should contain the case itself
      const caseSOs = objects.filter((so) => so.type === CASE_SAVED_OBJECT);
      expect(caseSOs).to.have.length(1);

      // Should contain the referenced template
      const templateSOs = objects.filter((so) => so.type === CASE_TEMPLATE_SAVED_OBJECT);
      expect(templateSOs).to.have.length(1);
      expect(templateSOs[0].attributes.templateId).to.eql(template.templateId);

      // Should contain both field definitions: the $ref'd one and the global one
      const fieldDefSOs = objects.filter((so) => so.type === CASE_FIELD_DEFINITION_SAVED_OBJECT);
      expect(fieldDefSOs).to.have.length(2);
      const fieldDefNames = fieldDefSOs.map((so) => so.attributes.name);
      expect(fieldDefNames).to.contain('incident_type');
      expect(fieldDefNames).to.contain('environment');
    });

    it('exports a template-less case without template SOs but with global field definitions', async () => {
      // Create a global field definition — should be bundled even without a template reference,
      // because a template-less case may carry extended_fields keyed by global defs.
      await supertest
        .post(`${getSpaceUrlPrefix('default')}${FIELD_DEFINITIONS_URL}`)
        .set('kbn-xsrf', 'true')
        .send(buildGlobalFieldDefinitionBody())
        .expect(200);

      // Create a non-global field definition — should NOT be bundled (not global, not $ref'd).
      await supertest
        .post(`${getSpaceUrlPrefix('default')}${FIELD_DEFINITIONS_URL}`)
        .set('kbn-xsrf', 'true')
        .send(buildFieldDefinitionBody())
        .expect(200);

      // Create a template that references the non-global field — should NOT be bundled either,
      // since no exported case references this template.
      await supertest
        .post(`${getSpaceUrlPrefix('default')}${TEMPLATES_URL}`)
        .set('kbn-xsrf', 'true')
        .send(buildTemplateBody())
        .expect(200);

      // Case has no template reference
      await createCase(supertest, getPostCaseRequest({ owner: 'securitySolutionFixture' }));

      const { text } = await supertest
        .post(`/api/saved_objects/_export`)
        .send({
          type: ['cases'],
          excludeExportDetails: true,
          includeReferencesDeep: true,
        })
        .set('kbn-xsrf', 'true');

      const objects = ndjsonToObjects(text);

      // No template SOs — no case referenced a template.
      expect(objects.filter((so) => so.type === CASE_TEMPLATE_SAVED_OBJECT)).to.have.length(0);

      // The global field definition must be bundled; the non-global must not.
      const fieldDefSOs = objects.filter((so) => so.type === CASE_FIELD_DEFINITION_SAVED_OBJECT);
      expect(fieldDefSOs).to.have.length(1);
      expect(fieldDefSOs[0].attributes.name).to.eql('environment');
    });

    it('roundtrip: export then re-import a case with template and field definitions', async () => {
      // Create a field definition used by the template
      await supertest
        .post(`${getSpaceUrlPrefix('default')}${FIELD_DEFINITIONS_URL}`)
        .set('kbn-xsrf', 'true')
        .send(
          buildFieldDefinitionBody({
            name: 'priority',
            definition: yamlStringify({
              name: 'priority',
              control: 'SELECT_BASIC',
              label: 'Priority',
              type: 'keyword',
              metadata: { options: ['low', 'medium', 'high'] },
            }),
          })
        )
        .expect(200);

      // Create a template that $refs the field definition
      const { body: template } = await supertest
        .post(`${getSpaceUrlPrefix('default')}${TEMPLATES_URL}`)
        .set('kbn-xsrf', 'true')
        .send(
          buildTemplateBody({
            name: 'Roundtrip Template',
            definition: yamlStringify({
              name: 'Roundtrip Template',
              fields: [{ $ref: 'priority' }],
            }),
          })
        )
        .expect(200);

      // Create a case referencing the template
      await createCase(supertest, {
        ...getPostCaseRequest({
          owner: 'securitySolutionFixture',
          title: 'A case with a template',
        }),
        template: { id: template.templateId, version: template.templateVersion },
      });

      // Export cases (includes referenced templates and field definitions via onExport hook)
      const exportResponse = await supertest
        .post('/api/saved_objects/_export')
        .send({ type: ['cases'], excludeExportDetails: true, includeReferencesDeep: true })
        .set('kbn-xsrf', 'true');

      expect(exportResponse.status).to.eql(
        200,
        `Export returned ${exportResponse.status}: ${JSON.stringify(exportResponse.body)}`
      );

      const exportedNdjson: string = exportResponse.text;
      const exportedObjects = ndjsonToObjects(exportedNdjson);
      const exportedCases = exportedObjects.filter((o) => o.type === CASE_SAVED_OBJECT);
      const exportedTemplates = exportedObjects.filter(
        (o) => o.type === CASE_TEMPLATE_SAVED_OBJECT
      );
      const exportedFieldDefs = exportedObjects.filter(
        (o) => o.type === CASE_FIELD_DEFINITION_SAVED_OBJECT
      );

      expect(exportedCases).to.have.length(
        1,
        `Export contained ${exportedCases.length} case(s), types: ${exportedObjects
          .map((o) => o.type)
          .join(', ')}`
      );
      expect(exportedTemplates).to.have.length(
        1,
        `Export contained ${exportedTemplates.length} template(s) — onExport hook may have not fired`
      );
      expect(exportedFieldDefs).to.have.length(
        1,
        `Export contained ${exportedFieldDefs.length} field definition(s)`
      );

      // Wipe all case data so we can test clean import
      await deleteAllCaseItems(es);

      // Write exported NDJSON to a temp file (same mechanism as all other passing import tests)
      const tmpFile = join(tmpdir(), `kibana-cases-export-${Date.now()}.ndjson`);
      writeFileSync(tmpFile, exportedNdjson, 'utf-8');

      let importBody: Record<string, unknown> = {};
      try {
        const importResponse = await supertest
          .post('/api/saved_objects/_import')
          .query({ overwrite: true })
          .attach('file', tmpFile)
          .set('kbn-xsrf', 'true');

        expect(importResponse.status).to.eql(
          200,
          `Import returned ${importResponse.status}: ${JSON.stringify(importResponse.body)}`
        );

        importBody = importResponse.body as Record<string, unknown>;
      } finally {
        try {
          unlinkSync(tmpFile);
        } catch {
          // ignore cleanup errors
        }
      }

      const importErrors = (importBody.errors as unknown[]) ?? [];
      expect(importErrors).to.have.length(
        0,
        `Import had SO-level errors: ${JSON.stringify(importErrors)}`
      );
      expect(importBody.successCount).to.eql(
        exportedObjects.length,
        `Import successCount ${importBody.successCount} ≠ exported ${
          exportedObjects.length
        }: ${JSON.stringify(importBody)}`
      );

      // The case should be findable after import
      const { body: findResponse } = await supertest
        .get(`${getSpaceUrlPrefix('default')}/api/cases/_find`)
        .set('kbn-xsrf', 'true')
        .expect(200);

      expect(findResponse.total).to.eql(
        1,
        `Expected 1 case after import but got ${findResponse.total}`
      );
      expect(findResponse.cases[0].title).to.eql('A case with a template');

      // The template should have been re-imported
      const { body: templatesResponse } = await supertest
        .get(`${getSpaceUrlPrefix('default')}${TEMPLATES_URL}`)
        .set('kbn-xsrf', 'true')
        .expect(200);

      expect(templatesResponse.templates).to.have.length(
        1,
        `Expected 1 template after import but got ${
          templatesResponse.templates?.length
        }: ${JSON.stringify(
          templatesResponse.templates?.map((t: Record<string, unknown>) => t.name)
        )}`
      );
      expect(templatesResponse.templates[0].name).to.eql('Roundtrip Template');

      // The field definition should have been re-imported
      const { body: fieldDefsResponse } = await supertest
        .get(`${getSpaceUrlPrefix('default')}${FIELD_DEFINITIONS_URL}`)
        .query({ owner: 'securitySolutionFixture' })
        .set('kbn-xsrf', 'true')
        .expect(200);

      expect(fieldDefsResponse.fieldDefinitions).to.have.length(
        1,
        `Expected 1 field def after import but got ${
          fieldDefsResponse.fieldDefinitions?.length
        }: ${JSON.stringify(
          fieldDefsResponse.fieldDefinitions?.map((f: Record<string, unknown>) => f.name)
        )}`
      );
      expect(fieldDefsResponse.fieldDefinitions[0].name).to.eql('priority');
    });
  });
};
