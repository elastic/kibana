/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { getCloudShellUrlFromAgentPolicy } from './get_cloud_shell_url_from_agent_policy';

describe('getCloudShellUrlFromAgentPolicy', () => {
  it('should return undefined when selectedPolicy is undefined', () => {
    const result = getCloudShellUrlFromAgentPolicy();
    expect(result).toBeUndefined();
  });

  it('should return undefined when selectedPolicy has no package_policies', () => {
    const selectedPolicy = {};
    // @ts-expect-error
    const result = getCloudShellUrlFromAgentPolicy(selectedPolicy);
    expect(result).toBeUndefined();
  });

  it('should return undefined when no input has enabled and config.cloud_shell_url', () => {
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
    // @ts-expect-error
    const result = getCloudShellUrlFromAgentPolicy(selectedPolicy);
    expect(result).toBeUndefined();
  });

  it('should return the first config.cloud_shell_url when available', () => {
    const selectedPolicy = {
      package_policies: [
        {
          inputs: [
            { enabled: false, config: { cloud_shell_url: { value: 'url1' } } },
            { enabled: false, config: { cloud_shell_url: { value: 'url2' } } },
            { enabled: false, config: { other_property: 'value' } },
          ],
        },
        {
          inputs: [
            { enabled: false, config: {} },
            { enabled: true, config: { cloud_shell_url: { value: 'url3' } } },
            { enabled: true, config: { cloud_shell_url: { value: 'url4' } } },
          ],
        },
      ],
    };
    // @ts-expect-error
    const result = getCloudShellUrlFromAgentPolicy(selectedPolicy);
    expect(result).toBe('url3');
  });
});
