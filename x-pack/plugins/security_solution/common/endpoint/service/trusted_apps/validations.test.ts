/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isValidPath, isWindowsWildcardPathValid, isMacWildcardPathValid } from './validations';
import { OperatingSystem } from '../../types';

describe('Validate Windows paths', () => {
  it('should return TRUE when paths are exact', () => {
    expect(isValidPath({ os: OperatingSystem.WINDOWS, value: 'c:\\folder\\path.exe' })).toEqual(
      true
    );
  });

  it('should  return FALSE when paths have /', () => {
    expect(isValidPath({ os: OperatingSystem.WINDOWS, value: '/folder/path.dmg' })).toEqual(false);
    expect(isValidPath({ os: OperatingSystem.WINDOWS, value: '/usr/bin' })).toEqual(false);
  });

  it('should return TRUE when paths have wildcards', () => {
    expect(isWindowsWildcardPathValid('c:\\**\\path.exe')).toEqual(true);
    expect(isWindowsWildcardPathValid('d:\\**\\path.exe')).toEqual(true);
    expect(isWindowsWildcardPathValid('e:\\**\\*.exe')).toEqual(true);
    expect(isWindowsWildcardPathValid('f:\\**\\*.*')).toEqual(true);
    expect(isWindowsWildcardPathValid('a:\\*.*')).toEqual(true);
  });
});

describe('Validate Linux/Mac paths', () => {
  it('should return TRUE for exact paths', () => {
    expect(isValidPath({ os: OperatingSystem.LINUX, value: '/' })).toEqual(true);
    expect(isValidPath({ os: OperatingSystem.LINUX, value: '/usr' })).toEqual(true);
    expect(isValidPath({ os: OperatingSystem.LINUX, value: '/usr/bin' })).toEqual(true);
    expect(isValidPath({ os: OperatingSystem.MAC, value: '/usr/bin/x.js' })).toEqual(true);
    expect(isValidPath({ os: OperatingSystem.MAC, value: '/usr/bin/var/x.dmg' })).toEqual(true);
  });

  it('should return FALSE for windows paths', () => {
    expect(isValidPath({ os: OperatingSystem.MAC, value: 'c:\\' })).toEqual(false);
    expect(isValidPath({ os: OperatingSystem.MAC, value: 'c:\\folder\\file.exe' })).toEqual(false);
    expect(isValidPath({ os: OperatingSystem.MAC, value: 'd:\\file.exe' })).toEqual(false);
  });

  it('should validate wildcard paths', () => {
    expect(isMacWildcardPathValid('/opt/*')).toEqual(true);
    expect(isMacWildcardPathValid('/opt/*.dmg')).toEqual(true);
    expect(isMacWildcardPathValid('/opt/bin/*')).toEqual(true);
    expect(isMacWildcardPathValid('/opt/bin/*.txt')).toEqual(true);
  });
});
