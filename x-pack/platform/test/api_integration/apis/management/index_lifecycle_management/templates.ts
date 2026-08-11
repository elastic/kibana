/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../../../ftr_provider_context';
import { initElasticsearchHelpers, getRandomString } from './lib';
import { getTemplatePayload, getPolicyPayload } from './fixtures';
import { registerHelpers as registerTemplatesHelpers } from './templates.helpers';
import { registerHelpers as registerPoliciesHelpers } from './policies.helpers';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  interface IlmTemplateListItem {
    name: string;
    settings: {
      index?: {
        lifecycle?: {
          name?: string;
          rollover_alias?: string;
        };
      };
    };
  }

  const { createIndexTemplate, cleanUp: cleanUpEsResources } = initElasticsearchHelpers(getService);

  const { loadTemplates, addPolicyToTemplate } = registerTemplatesHelpers({
    supertest,
  });

  const { createPolicy, cleanUp: cleanUpPolicies } = registerPoliciesHelpers({ supertest });

  describe('templates', () => {
    after(() => Promise.all([cleanUpEsResources(), cleanUpPolicies()]));

    describe('list', () => {
      it('should load all the templates', async () => {
        // Create a template with the ES client
        const templateName = getRandomString();
        await createIndexTemplate(templateName, getTemplatePayload());

        // Load the templates and verify that our new template is in the list
        const { body: templates }: { body: IlmTemplateListItem[] } = await loadTemplates().expect(
          200
        );
        const templateNames = templates.map((t) => t.name);
        expect(templateNames).to.contain(templateName);
      });

      it('should filter out the system template whose index patterns does not contain wildcard', async () => {
        // system template start witht a "."
        const templateName = `.${getRandomString()}`;
        const template = getTemplatePayload();
        await createIndexTemplate(templateName, { ...template, index_patterns: ['no-wildcard'] });

        // Load the templates and verify that our new template is **not** in the list
        const { body: templates }: { body: IlmTemplateListItem[] } = await loadTemplates().expect(
          200
        );
        const templateNames = templates.map((t) => t.name);
        expect(templateNames).not.to.contain(templateName);
      });
    });

    describe('update', () => {
      it('should add a policy to a template', async () => {
        // Create policy
        const policy = getPolicyPayload('template-test-policy');
        const { name: policyName } = policy;
        await createPolicy(policy);

        // Create template
        const templateName = getRandomString();
        const template = getTemplatePayload();
        await createIndexTemplate(templateName, template);

        const rolloverAlias = getRandomString();

        // Attach policy to template
        await addPolicyToTemplate(templateName, policyName, rolloverAlias).expect(200);

        // Fetch the template and verify that the policy has been attached
        const { body: templates }: { body: IlmTemplateListItem[] } = await loadTemplates();
        const fetchedTemplate = templates.find((t) => templateName === t.name)!;
        const lifecycle = fetchedTemplate.settings.index?.lifecycle!;
        expect(lifecycle.name).to.equal(policyName);
        expect(lifecycle.rollover_alias).to.equal(rolloverAlias);
      });
    });
  });
}
