/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isPathValid } from './validations';
import { OperatingSystem, ConditionEntryField } from '../../types';

describe('Validate Windows paths', () => {
  it('should return TRUE when paths are exact', () => {
    expect(
      isPathValid({
        os: OperatingSystem.WINDOWS,
        field: ConditionEntryField.PATH,
        type: 'match',
        value: 'c:\\folder',
      })
    ).toEqual(true);

    expect(
      isPathValid({
        os: OperatingSystem.WINDOWS,
        field: ConditionEntryField.PATH,
        type: 'match',
        value: 'c:\\path.exe',
      })
    ).toEqual(true);

    expect(
      isPathValid({
        os: OperatingSystem.WINDOWS,
        field: ConditionEntryField.PATH,
        type: 'match',
        value: 'c:\\folder\\path.exe',
      })
    ).toEqual(true);
  });

  it('should return FALSE when paths have /', () => {
    expect(
      isPathValid({
        os: OperatingSystem.WINDOWS,
        field: ConditionEntryField.PATH,
        type: 'match',
        value: '/folder/path.dmg',
      })
    ).toEqual(false);

    expect(
      isPathValid({
        os: OperatingSystem.WINDOWS,
        field: ConditionEntryField.PATH,
        type: 'match',
        value: '/usr/bin',
      })
    ).toEqual(false);
  });

  it('should return FALSE when paths do not have a wildcard', () => {
    expect(
      isPathValid({
        os: OperatingSystem.WINDOWS,
        field: ConditionEntryField.PATH,
        type: 'wildcard',
        value: 'c:\\folder',
      })
    ).toEqual(false);

    expect(
      isPathValid({
        os: OperatingSystem.WINDOWS,
        field: ConditionEntryField.PATH,
        type: 'wildcard',
        value: 'c:\\path.exe',
      })
    ).toEqual(false);

    expect(
      isPathValid({
        os: OperatingSystem.WINDOWS,
        field: ConditionEntryField.PATH,
        type: 'wildcard',
        value: 'c:\\folder\\path.exe',
      })
    ).toEqual(false);
  });

  it('should return TRUE when paths have wildcards', () => {
    expect(
      isPathValid({
        os: OperatingSystem.WINDOWS,
        field: ConditionEntryField.PATH,
        type: 'wildcard',
        value: 'c:\\**\\path.exe',
      })
    ).toEqual(true);

    expect(
      isPathValid({
        os: OperatingSystem.WINDOWS,
        field: ConditionEntryField.PATH,
        type: 'wildcard',
        value: 'd:\\**\\path.exe',
      })
    ).toEqual(true);

    expect(
      isPathValid({
        os: OperatingSystem.WINDOWS,
        field: ConditionEntryField.PATH,
        type: 'wildcard',
        value: 'e:\\**\\*.exe',
      })
    ).toEqual(true);

    expect(
      isPathValid({
        os: OperatingSystem.WINDOWS,
        field: ConditionEntryField.PATH,
        type: 'wildcard',
        value: 'f:\\**\\*.*',
      })
    ).toEqual(true);

    expect(
      isPathValid({
        os: OperatingSystem.WINDOWS,
        field: ConditionEntryField.PATH,
        type: 'wildcard',
        value: 'a:\\*.*',
      })
    ).toEqual(true);

    expect(
      isPathValid({
        os: OperatingSystem.WINDOWS,
        field: ConditionEntryField.PATH,
        type: 'wildcard',
        value: 'C:\\?indows\\pat?',
      })
    ).toEqual(true);

    expect(
      isPathValid({
        os: OperatingSystem.WINDOWS,
        field: ConditionEntryField.PATH,
        type: 'wildcard',
        value: 'C:\\*?',
      })
    ).toEqual(true);

    expect(
      isPathValid({
        os: OperatingSystem.WINDOWS,
        field: ConditionEntryField.PATH,
        type: 'wildcard',
        value: 'C:\\**',
      })
    ).toEqual(true);

    expect(
      isPathValid({
        os: OperatingSystem.WINDOWS,
        field: ConditionEntryField.PATH,
        type: 'wildcard',
        value: 'C:\\??',
      })
    ).toEqual(true);
  });

  it('should return FALSE when paths have / instead of \\ with wildcards', () => {
    expect(
      isPathValid({
        os: OperatingSystem.WINDOWS,
        field: ConditionEntryField.PATH,
        type: 'wildcard',
        value: 'c:/**/path.exe',
      })
    ).toEqual(false);

    expect(
      isPathValid({
        os: OperatingSystem.WINDOWS,
        field: ConditionEntryField.PATH,
        type: 'wildcard',
        value: 'd:/**/path.exe',
      })
    ).toEqual(false);

    expect(
      isPathValid({
        os: OperatingSystem.WINDOWS,
        field: ConditionEntryField.PATH,
        type: 'wildcard',
        value: 'e:/**/*.exe',
      })
    ).toEqual(false);

    expect(
      isPathValid({
        os: OperatingSystem.WINDOWS,
        field: ConditionEntryField.PATH,
        type: 'wildcard',
        value: 'f:/**/*.*',
      })
    ).toEqual(false);

    expect(
      isPathValid({
        os: OperatingSystem.WINDOWS,
        field: ConditionEntryField.PATH,
        type: 'wildcard',
        value: 'a:/*.*',
      })
    ).toEqual(false);

    expect(
      isPathValid({
        os: OperatingSystem.WINDOWS,
        field: ConditionEntryField.PATH,
        type: 'wildcard',
        value: 'C:/?indows/pat?',
      })
    ).toEqual(false);

    expect(
      isPathValid({
        os: OperatingSystem.WINDOWS,
        field: ConditionEntryField.PATH,
        type: 'wildcard',
        value: 'C:/*?',
      })
    ).toEqual(false);
  });
});

describe('Validate Linux/Mac paths', () => {
  it('should return TRUE for exact paths', () => {
    expect(
      isPathValid({
        os: OperatingSystem.LINUX,
        field: ConditionEntryField.PATH,
        type: 'match',
        value: '/',
      })
    ).toEqual(true);

    expect(
      isPathValid({
        os: OperatingSystem.LINUX,
        field: ConditionEntryField.PATH,
        type: 'match',
        value: '/usr',
      })
    ).toEqual(true);

    expect(
      isPathValid({
        os: OperatingSystem.LINUX,
        field: ConditionEntryField.PATH,
        type: 'match',
        value: '/usr/bin',
      })
    ).toEqual(true);

    expect(
      isPathValid({
        os: OperatingSystem.MAC,
        field: ConditionEntryField.PATH,
        type: 'match',
        value: '/usr/bin/x.js',
      })
    ).toEqual(true);

    expect(
      isPathValid({
        os: OperatingSystem.MAC,
        field: ConditionEntryField.PATH,
        type: 'match',
        value: '/usr/bin/var/x.dmg',
      })
    ).toEqual(true);
  });

  it('should return FALSE for paths with \\', () => {
    expect(
      isPathValid({
        os: OperatingSystem.MAC,
        field: ConditionEntryField.PATH,
        type: 'match',
        value: 'c:\\',
      })
    ).toEqual(false);

    expect(
      isPathValid({
        os: OperatingSystem.MAC,
        field: ConditionEntryField.PATH,
        type: 'match',
        value: 'c:\\folder\\file.exe',
      })
    ).toEqual(false);

    expect(
      isPathValid({
        os: OperatingSystem.MAC,
        field: ConditionEntryField.PATH,
        type: 'match',
        value: 'd:\\file.exe',
      })
    ).toEqual(false);
  });

  it('should return TRUE for wildcard paths', () => {
    expect(
      isPathValid({
        os: OperatingSystem.MAC,
        field: ConditionEntryField.PATH,
        type: 'wildcard',
        value: '/use?/?',
      })
    ).toEqual(true);

    expect(
      isPathValid({
        os: OperatingSystem.MAC,
        field: ConditionEntryField.PATH,
        type: 'wildcard',
        value: '/user/*/stuff/*',
      })
    ).toEqual(true);

    expect(
      isPathValid({
        os: OperatingSystem.MAC,
        field: ConditionEntryField.PATH,
        type: 'wildcard',
        value: '/opt/*',
      })
    ).toEqual(true);

    expect(
      isPathValid({
        os: OperatingSystem.MAC,
        field: ConditionEntryField.PATH,
        type: 'wildcard',
        value: '/opt/**',
      })
    ).toEqual(true);

    expect(
      isPathValid({
        os: OperatingSystem.MAC,
        field: ConditionEntryField.PATH,
        type: 'wildcard',
        value: '/o??/**',
      })
    ).toEqual(true);

    expect(
      isPathValid({
        os: OperatingSystem.MAC,
        field: ConditionEntryField.PATH,
        type: 'wildcard',
        value: '/opt/*.dmg',
      })
    ).toEqual(true);

    expect(
      isPathValid({
        os: OperatingSystem.MAC,
        field: ConditionEntryField.PATH,
        type: 'wildcard',
        value: '/opt/bin/*',
      })
    ).toEqual(true);

    expect(
      isPathValid({
        os: OperatingSystem.MAC,
        field: ConditionEntryField.PATH,
        type: 'wildcard',
        value: '/opt/bin/*.txt',
      })
    ).toEqual(true);
  });

  it('should return FALSE when paths do not have a wildcard', () => {
    expect(
      isPathValid({
        os: OperatingSystem.MAC,
        field: ConditionEntryField.PATH,
        type: 'wildcard',
        value: '/',
      })
    ).toEqual(false);

    expect(
      isPathValid({
        os: OperatingSystem.MAC,
        field: ConditionEntryField.PATH,
        type: 'wildcard',
        value: '/opt/bin',
      })
    ).toEqual(false);

    expect(
      isPathValid({
        os: OperatingSystem.MAC,
        field: ConditionEntryField.PATH,
        type: 'wildcard',
        value: '/x.dmg',
      })
    ).toEqual(false);

    expect(
      isPathValid({
        os: OperatingSystem.MAC,
        field: ConditionEntryField.PATH,
        type: 'wildcard',
        value: '/opt/x.dmg',
      })
    ).toEqual(false);
  });

  it('should return FALSE for wildcard paths with \\', () => {
    expect(
      isPathValid({
        os: OperatingSystem.MAC,
        field: ConditionEntryField.PATH,
        type: 'wildcard',
        value: 'c:\\**\\path.exe',
      })
    ).toEqual(false);

    expect(
      isPathValid({
        os: OperatingSystem.MAC,
        field: ConditionEntryField.PATH,
        type: 'wildcard',
        value: 'd:\\**\\path.exe',
      })
    ).toEqual(false);

    expect(
      isPathValid({
        os: OperatingSystem.MAC,
        field: ConditionEntryField.PATH,
        type: 'wildcard',
        value: 'e:\\**\\*.exe',
      })
    ).toEqual(false);

    expect(
      isPathValid({
        os: OperatingSystem.MAC,
        field: ConditionEntryField.PATH,
        type: 'wildcard',
        value: 'f:\\**\\*.*',
      })
    ).toEqual(false);

    expect(
      isPathValid({
        os: OperatingSystem.MAC,
        field: ConditionEntryField.PATH,
        type: 'wildcard',
        value: 'a:\\*.*',
      })
    ).toEqual(false);

    expect(
      isPathValid({
        os: OperatingSystem.MAC,
        field: ConditionEntryField.PATH,
        type: 'wildcard',
        value: 'C:\\?indows\\pat?',
      })
    ).toEqual(false);

    expect(
      isPathValid({
        os: OperatingSystem.MAC,
        field: ConditionEntryField.PATH,
        type: 'wildcard',
        value: 'C:\\*?',
      })
    ).toEqual(false);
  });
});
