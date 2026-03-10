/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use it except in compliance with the Elastic License 2.0.
 */

import { editAgentConfigurationHref } from './agent_configuration_links';
import { ENVIRONMENT_NOT_DEFINED } from '../../../../../common/environment_filter_values';

const mockBasePath = {
  prepend: (path: string) => `/base${path}`,
} as any;

describe('editAgentConfigurationHref', () => {
  it('uses ENVIRONMENT_NOT_DEFINED when configService is undefined', () => {
    const href = editAgentConfigurationHref(undefined as any, '', mockBasePath);
    expect(href).toContain(`environment=${encodeURIComponent(ENVIRONMENT_NOT_DEFINED.value)}`);
  });

  it('uses ENVIRONMENT_NOT_DEFINED when configService.environment is missing', () => {
    const href = editAgentConfigurationHref({ name: 'my-service' }, '', mockBasePath);
    expect(href).toContain(`environment=${encodeURIComponent(ENVIRONMENT_NOT_DEFINED.value)}`);
  });

  it('uses configService.environment when present', () => {
    const href = editAgentConfigurationHref(
      { name: 'my-service', environment: 'production' },
      '',
      mockBasePath
    );
    expect(href).toContain('environment=production');
  });

  it('does not throw when configService is undefined and returns valid path', () => {
    const href = editAgentConfigurationHref(undefined as any, '', mockBasePath);
    expect(href).toContain('/app/apm/settings/agent-configuration/edit');
  });
});
