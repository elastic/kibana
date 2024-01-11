/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PackageInfo, UpdatePackagePolicy } from '../../../../types';

import { getNewSecrets } from './get_new_secrets';

describe('getNewSecrets', () => {
  it('does not find new secrets when there are no secrets configured', () => {
    const packageInfo = {
      name: 'mock-package',
      title: 'Mock package',
      version: '0.0.0',
      vars: [
        {
          name: 'package-var',
          type: 'string',
          secret: false,
        },
      ],
      policy_templates: [
        {
          name: 'test-policy-template',
          inputs: [
            {
              type: 'test-input',
              title: 'Test input',
              description: 'Test input',
              vars: [
                {
                  name: 'policy-template-var',
                  type: 'string',
                  secret: false,
                },
              ],
            },
          ],
        },
      ],
    } as unknown as PackageInfo;

    const packagePolicy = {
      vars: [
        {
          name: 'package-var',
          value: 'test',
        },
      ],
      inputs: [
        {
          name: 'test-input',
          vars: {
            'policy-template-var': {
              value: 'test',
            },
          },
        },
      ],
    } as unknown as UpdatePackagePolicy;

    expect(
      getNewSecrets({
        packageInfo,
        packagePolicy,
      })
    ).toEqual([]);
  });

  it('finds new secrets when they exist', () => {
    const packageInfo = {
      name: 'mock-package',
      title: 'Mock package',
      version: '0.0.0',
      vars: [
        {
          name: 'package-var',
          type: 'string',
          secret: true,
        },
      ],
      policy_templates: [
        {
          name: 'test-policy-template',
          inputs: [
            {
              type: 'test-input',
              title: 'Test input',
              description: 'Test input',
              vars: [
                {
                  name: 'policy-template-var',
                  type: 'string',
                  secret: true,
                },
              ],
            },
          ],
        },
      ],
    } as unknown as PackageInfo;

    const packagePolicy = {
      vars: [
        {
          name: 'package-var',
          value: 'test',
        },
      ],
      inputs: [
        {
          name: 'test-input',
          vars: {
            'policy-template-var': {
              value: 'test',
            },
          },
        },
      ],
    } as unknown as UpdatePackagePolicy;

    expect(
      getNewSecrets({
        packageInfo,
        packagePolicy,
      })
    ).toEqual([
      {
        name: 'package-var',
        secret: true,
        type: 'string',
      },
      {
        name: 'policy-template-var',
        secret: true,
        type: 'string',
      },
    ]);
  });
});
