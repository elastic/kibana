/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getTemplateVersion } from './get_template_version';

describe('getTemplateVersion', () => {
  it('converts a release build version string into an integer', () => {
    const versionStr1 = '7.1.2';
    expect(getTemplateVersion(versionStr1)).toBe(7010299);

    const versionStr2 = '10.1.0';
    expect(getTemplateVersion(versionStr2)).toBe(10010099);
  });

  it('converts a alpha build version string into an integer', () => {
    const versionStr1 = '7.0.0-alpha1';
    expect(getTemplateVersion(versionStr1)).toBe(7000001);

    const versionStr2 = '7.0.0-alpha3';
    expect(getTemplateVersion(versionStr2)).toBe(7000003);
  });

  it('converts a beta build version string into an integer', () => {
    const versionStr1 = '7.0.0-beta4';
    expect(getTemplateVersion(versionStr1)).toBe(7000029);

    const versionStr5 = '7.0.0-beta8';
    expect(getTemplateVersion(versionStr5)).toBe(7000033);
  });

  it('converts a snapshot build version string into an integer', () => {
    expect(getTemplateVersion('8.0.0-alpha1')).toBe(8000001);
    expect(getTemplateVersion('8.0.0-alpha1-snapshot')).toBe(8000001);
  });

  it('not intended to handle any version parts with 3-digits: it will create malformed integer values', () => {
    expect(getTemplateVersion('60.61.1') === getTemplateVersion('6.6.101')).toBe(true); // both produce 60610199
    expect(getTemplateVersion('1.32.0') < getTemplateVersion('1.3.223423')).toBe(true);
  });
});
