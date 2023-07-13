/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { getCloudFormationTemplateUrlFromPackagePolicy } from './get_cloud_formation_template_url_from_package_policy';

describe('getCloudFormationTemplateUrlFromPackagePolicy', () => {
  test('returns undefined when packagePolicy is undefined', () => {
    const result = getCloudFormationTemplateUrlFromPackagePolicy(undefined);
    expect(result).toBeUndefined();
  });

  test('returns undefined when packagePolicy is defined but inputs are empty', () => {
    const packagePolicy = { inputs: [] };
    // @ts-expect-error
    const result = getCloudFormationTemplateUrlFromPackagePolicy(packagePolicy);
    expect(result).toBeUndefined();
  });

  test('returns undefined when no enabled input has a cloudFormationTemplateUrl', () => {
    const packagePolicy = {
      inputs: [
        { enabled: false, config: { cloud_formation_template_url: { value: 'template1' } } },
        { enabled: false, config: { cloud_formation_template_url: { value: 'template2' } } },
      ],
    };
    // @ts-expect-error
    const result = getCloudFormationTemplateUrlFromPackagePolicy(packagePolicy);
    expect(result).toBeUndefined();
  });

  test('returns the cloudFormationTemplateUrl of the first enabled input', () => {
    const packagePolicy = {
      inputs: [
        { enabled: false, config: { cloud_formation_template_url: { value: 'template1' } } },
        { enabled: true, config: { cloud_formation_template_url: { value: 'template2' } } },
        { enabled: true, config: { cloud_formation_template_url: { value: 'template3' } } },
      ],
    };
    // @ts-expect-error
    const result = getCloudFormationTemplateUrlFromPackagePolicy(packagePolicy);
    expect(result).toBe('template2');
  });

  test('returns the cloudFormationTemplateUrl of the first enabled input and ignores subsequent inputs', () => {
    const packagePolicy = {
      inputs: [
        { enabled: true, config: { cloud_formation_template_url: { value: 'template1' } } },
        { enabled: true, config: { cloud_formation_template_url: { value: 'template2' } } },
        { enabled: true, config: { cloud_formation_template_url: { value: 'template3' } } },
      ],
    };
    // @ts-expect-error
    const result = getCloudFormationTemplateUrlFromPackagePolicy(packagePolicy);
    expect(result).toBe('template1');
  });

  // Add more test cases as needed
});
