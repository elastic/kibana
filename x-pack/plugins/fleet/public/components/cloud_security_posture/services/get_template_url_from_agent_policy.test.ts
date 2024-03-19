/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  getTemplateUrlFromAgentPolicy,
  SUPPORTED_TEMPLATES_URL_FROM_AGENT_POLICY_CONFIG,
} from './get_template_url_from_agent_policy';

describe('getTemplateUrlFromAgentPolicy', () => {
  it('should return undefined when selectedPolicy is undefined', () => {
    const result = getTemplateUrlFromAgentPolicy(
      SUPPORTED_TEMPLATES_URL_FROM_AGENT_POLICY_CONFIG.CLOUD_FORMATION
    );
    expect(result).toBeUndefined();
  });

  it('should return undefined when selectedPolicy has no package_policies', () => {
    const selectedPolicy = {};
    const result = getTemplateUrlFromAgentPolicy(
      SUPPORTED_TEMPLATES_URL_FROM_AGENT_POLICY_CONFIG.CLOUD_FORMATION,
      // @ts-expect-error
      selectedPolicy
    );
    expect(result).toBeUndefined();
  });

  it('should return undefined when no input has enabled and config.cloud_formation_template_url', () => {
    const selectedPolicy = {
      package_policies: [
        {
          inputs: [
            { enabled: false, config: {} },
            { enabled: true, config: {} },
            { enabled: true, config: { other_property: 'value' } },
          ],
        },
        {
          inputs: [
            { enabled: false, config: {} },
            { enabled: false, config: {} },
          ],
        },
      ],
    };
    const result = getTemplateUrlFromAgentPolicy(
      SUPPORTED_TEMPLATES_URL_FROM_AGENT_POLICY_CONFIG.CLOUD_FORMATION,
      // @ts-expect-error
      selectedPolicy
    );
    expect(result).toBeUndefined();
  });

  it('should return the first config.cloud_formation_template_url when available', () => {
    const selectedPolicy = {
      package_policies: [
        {
          inputs: [
            { enabled: false, config: { cloud_formation_template_url: { value: 'url1' } } },
            { enabled: false, config: { cloud_formation_template_url: { value: 'url2' } } },
            { enabled: false, config: { other_property: 'value' } },
          ],
        },
        {
          inputs: [
            { enabled: false, config: {} },
            { enabled: true, config: { cloud_formation_template_url: { value: 'url3' } } },
            { enabled: true, config: { cloud_formation_template_url: { value: 'url4' } } },
          ],
        },
      ],
    };
    const result = getTemplateUrlFromAgentPolicy(
      SUPPORTED_TEMPLATES_URL_FROM_AGENT_POLICY_CONFIG.CLOUD_FORMATION,
      // @ts-expect-error
      selectedPolicy
    );
    expect(result).toBe('url3');
  });

  it('should return the first config.arm_template_url when available', () => {
    const selectedPolicy = {
      package_policies: [
        {
          inputs: [
            { enabled: false, config: { arm_template_url: { value: 'url1' } } },
            { enabled: false, config: { arm_template_url: { value: 'url2' } } },
            { enabled: false, config: { other_property: 'value' } },
          ],
        },
        {
          inputs: [
            { enabled: false, config: {} },
            { enabled: true, config: { arm_template_url: { value: 'url3' } } },
            { enabled: true, config: { arm_template_url: { value: 'url4' } } },
          ],
        },
      ],
    };
    const result = getTemplateUrlFromAgentPolicy(
      SUPPORTED_TEMPLATES_URL_FROM_AGENT_POLICY_CONFIG.ARM_TEMPLATE,
      // @ts-expect-error
      selectedPolicy
    );
    expect(result).toBe('url3');
  });
});
