/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { agentPolicyFormValidation } from './agent_policy_validation';
describe('Agent Policy form validation', () => {
  it('should not return errors when agentPolicy is valid', () => {
    const result = agentPolicyFormValidation({
      namespace: 'default',
      name: 'policy',
    });
    expect(result).toEqual({});
  });

  it('should return error when agentPolicy has empty name', () => {
    const result = agentPolicyFormValidation({
      namespace: 'default',
      name: '',
    });
    expect(result.name).toBeDefined();
  });

  it('should return error when agentPolicy has empty namespace', () => {
    const result = agentPolicyFormValidation({
      namespace: '',
      name: 'policy',
    });
    expect(result.namespace).toBeDefined();
  });

  it('should return error when agentPolicy has negative unenroll timeout', () => {
    const result = agentPolicyFormValidation({
      namespace: 'default',
      name: 'policy',
      unenroll_timeout: -1,
    });
    expect(result.unenroll_timeout).toBeDefined();
  });

  it('should return error when agentPolicy has negative inactivity timeout', () => {
    const result = agentPolicyFormValidation({
      namespace: 'default',
      name: 'policy',
      inactivity_timeout: -1,
    });
    expect(result.inactivity_timeout).toBeDefined();
  });

  it('should return error when agentPolicy has http monitoring enabled without host or port', () => {
    expect(
      agentPolicyFormValidation({
        namespace: 'default',
        name: 'policy',
        monitoring_http: {
          enabled: true,
          host: 'localhost',
          port: 123,
        },
      })
    ).toEqual({});

    expect(
      agentPolicyFormValidation({
        namespace: 'default',
        name: 'policy',
        monitoring_http: {
          enabled: false,
          host: '',
        },
      })
    ).toEqual({});

    expect(
      Object.keys(
        agentPolicyFormValidation({
          namespace: 'default',
          name: 'policy',
          monitoring_http: {
            enabled: true,
            host: '',
            port: 123,
          },
        })
      )
    ).toEqual(['monitoring_http.host']);

    expect(
      Object.keys(
        agentPolicyFormValidation({
          namespace: 'default',
          name: 'policy',
          monitoring_http: {
            enabled: true,
            host: '',
          },
        })
      )
    ).toEqual(['monitoring_http.host', 'monitoring_http.port']);
  });

  it('should return error when agentPolicy has invalid diagnostics options', () => {
    expect(
      Object.keys(
        agentPolicyFormValidation({
          namespace: 'default',
          name: 'policy',
          monitoring_diagnostics: {
            limit: {
              burst: 0,
            },
            uploader: {
              max_retries: -1,
            },
          },
        })
      )
    ).toEqual([
      'monitoring_diagnostics.limit.burst',
      'monitoring_diagnostics.uploader.max_retries',
    ]);

    expect(
      Object.keys(
        agentPolicyFormValidation({
          namespace: 'default',
          name: 'policy',
          monitoring_diagnostics: {
            limit: {
              burst: -1,
            },
            uploader: {
              max_retries: 0,
            },
          },
        })
      )
    ).toEqual([
      'monitoring_diagnostics.limit.burst',
      'monitoring_diagnostics.uploader.max_retries',
    ]);
  });
});
