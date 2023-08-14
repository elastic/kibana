/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getCloudFormationTemplateUrlFromPackageInfo } from './get_cloud_formation_template_url_from_package_info';

describe('getCloudFormationTemplateUrlFromPackageInfo', () => {
  test('returns undefined when packageInfo is undefined', () => {
    const result = getCloudFormationTemplateUrlFromPackageInfo(undefined, 'test');
    expect(result).toBeUndefined();
  });

  test('returns undefined when packageInfo has no policy_templates', () => {
    const packageInfo = { inputs: [] };
    // @ts-expect-error
    const result = getCloudFormationTemplateUrlFromPackageInfo(packageInfo, 'test');
    expect(result).toBeUndefined();
  });

  test('returns undefined when integrationType is not found in policy_templates', () => {
    const packageInfo = { policy_templates: [{ name: 'template1' }, { name: 'template2' }] };
    // @ts-expect-error
    const result = getCloudFormationTemplateUrlFromPackageInfo(packageInfo, 'nonExistentTemplate');
    expect(result).toBeUndefined();
  });

  test('returns undefined when no input in the policy template has a cloudFormationTemplate', () => {
    const packageInfo = {
      policy_templates: [
        {
          name: 'template1',
          inputs: [
            { name: 'input1', vars: [] },
            { name: 'input2', vars: [{ name: 'var1', default: 'value1' }] },
          ],
        },
      ],
    };
    // @ts-expect-error
    const result = getCloudFormationTemplateUrlFromPackageInfo(packageInfo, 'template1');
    expect(result).toBeUndefined();
  });

  test('returns the cloudFormationTemplate from the policy template', () => {
    const packageInfo = {
      policy_templates: [
        {
          name: 'template1',
          inputs: [
            { name: 'input1', vars: [] },
            {
              name: 'input2',
              vars: [{ name: 'cloud_formation_template', default: 'cloud_formation_template_url' }],
            },
          ],
        },
      ],
    };
    // @ts-expect-error
    const result = getCloudFormationTemplateUrlFromPackageInfo(packageInfo, 'template1');
    expect(result).toBe('cloud_formation_template_url');
  });
});
