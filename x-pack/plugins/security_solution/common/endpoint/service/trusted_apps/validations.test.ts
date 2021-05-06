/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  isValidPath,
  isWindowsWildcardPathValid,
  isLinuxMacWildcardPathValid,
} from './validations';
import { OperatingSystem } from '../../types';

describe('Validate Windows paths', () => {
  it('should return TRUE when paths are exact', () => {
    expect(isValidPath({ os: OperatingSystem.WINDOWS, value: 'c:\\folder' })).toEqual(true);
    expect(isValidPath({ os: OperatingSystem.WINDOWS, value: 'c:\\path.exe' })).toEqual(true);
    expect(isValidPath({ os: OperatingSystem.WINDOWS, value: 'c:\\folder\\path.exe' })).toEqual(
      true
    );
  });

  it('should  return FALSE when paths have /', () => {
    expect(isValidPath({ os: OperatingSystem.WINDOWS, value: '/folder/path.dmg' })).toEqual(false);
    expect(isValidPath({ os: OperatingSystem.WINDOWS, value: '/usr/bin' })).toEqual(false);
  });

  it('should  return FALSE when paths do not have a wildcard', () => {
    expect(isWindowsWildcardPathValid('c:\\folder')).toEqual(false);
    expect(isWindowsWildcardPathValid('c:\\path.exe')).toEqual(false);
    expect(isWindowsWildcardPathValid('c:\\folder\\path.exe')).toEqual(false);
  });

  it('should return TRUE when paths have wildcards', () => {
    expect(isWindowsWildcardPathValid('c:\\**\\path.exe')).toEqual(true);
    expect(isWindowsWildcardPathValid('d:\\**\\path.exe')).toEqual(true);
    expect(isWindowsWildcardPathValid('e:\\**\\*.exe')).toEqual(true);
    expect(isWindowsWildcardPathValid('f:\\**\\*.*')).toEqual(true);
    expect(isWindowsWildcardPathValid('a:\\*.*')).toEqual(true);
    expect(isWindowsWildcardPathValid('C:\\?indows\\pat?')).toEqual(true);
    expect(isWindowsWildcardPathValid('C:\\*?')).toEqual(true);
    expect(isWindowsWildcardPathValid('C:\\**')).toEqual(true);
    expect(isWindowsWildcardPathValid('C:\\??')).toEqual(true);
  });

  it('should return FALSE when paths have / instead of \\ with wildcards', () => {
    expect(isWindowsWildcardPathValid('c:/**/path.exe')).toEqual(false);
    expect(isWindowsWildcardPathValid('d:/**/path.exe')).toEqual(false);
    expect(isWindowsWildcardPathValid('e:/**/*.exe')).toEqual(false);
    expect(isWindowsWildcardPathValid('f:/**/*.*')).toEqual(false);
    expect(isWindowsWildcardPathValid('a:/*.*')).toEqual(false);
    expect(isWindowsWildcardPathValid('C:/?indows/pat?')).toEqual(false);
    expect(isWindowsWildcardPathValid('C:/*?')).toEqual(false);
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

  it('should return FALSE for paths with \\', () => {
    expect(isValidPath({ os: OperatingSystem.MAC, value: 'c:\\' })).toEqual(false);
    expect(isValidPath({ os: OperatingSystem.MAC, value: 'c:\\folder\\file.exe' })).toEqual(false);
    expect(isValidPath({ os: OperatingSystem.MAC, value: 'd:\\file.exe' })).toEqual(false);
  });

  it('should return TRUE for wildcard paths', () => {
    expect(isLinuxMacWildcardPathValid('/use?/?')).toEqual(true);
    expect(isLinuxMacWildcardPathValid('/user/*/stuff/*')).toEqual(true);
    expect(isLinuxMacWildcardPathValid('/opt/*')).toEqual(true);
    expect(isLinuxMacWildcardPathValid('/opt/**')).toEqual(true);
    expect(isLinuxMacWildcardPathValid('/o??/**')).toEqual(true);
    expect(isLinuxMacWildcardPathValid('/opt/*.dmg')).toEqual(true);
    expect(isLinuxMacWildcardPathValid('/opt/bin/*')).toEqual(true);
    expect(isLinuxMacWildcardPathValid('/opt/bin/*.txt')).toEqual(true);
  });

  it('should  return FALSE when paths do not have a wildcard', () => {
    expect(isLinuxMacWildcardPathValid('/')).toEqual(false);
    expect(isLinuxMacWildcardPathValid('/opt/bin')).toEqual(false);
    expect(isLinuxMacWildcardPathValid('/x.dmg')).toEqual(false);
    expect(isLinuxMacWildcardPathValid('/opt/x.dmg')).toEqual(false);
  });

  it('should return FALSE for wildcard paths with \\', () => {
    expect(isLinuxMacWildcardPathValid('c:\\**\\path.exe')).toEqual(false);
    expect(isLinuxMacWildcardPathValid('d:\\**\\path.exe')).toEqual(false);
    expect(isLinuxMacWildcardPathValid('e:\\**\\*.exe')).toEqual(false);
    expect(isLinuxMacWildcardPathValid('f:\\**\\*.*')).toEqual(false);
    expect(isLinuxMacWildcardPathValid('a:\\*.*')).toEqual(false);
    expect(isLinuxMacWildcardPathValid('C:\\?indows\\pat?')).toEqual(false);
    expect(isLinuxMacWildcardPathValid('C:\\*?')).toEqual(false);
  });
});
