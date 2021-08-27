/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { getDeepLinks } from '.';
import { Capabilities } from '../../../../../../src/core/public';
import { SecurityPageName } from '../types';
import { mockGlobalState } from '../../common/mock';

describe('public search functions', () => {
  it('returns a subset of links for basic license, full set for platinum', () => {
    const basicLicense = 'basic';
    const platinumLicense = 'platinum';
    const basicLinks = getDeepLinks(mockGlobalState.app.enableExperimental, basicLicense);
    const platinumLinks = getDeepLinks(mockGlobalState.app.enableExperimental, platinumLicense);

    basicLinks.forEach((basicLink, index) => {
      const platinumLink = platinumLinks[index];
      expect(basicLink.id).toEqual(platinumLink.id);
      const platinumDeepLinksCount = platinumLink.deepLinks?.length || 0;
      const basicDeepLinksCount = basicLink.deepLinks?.length || 0;
      expect(platinumDeepLinksCount).toBeGreaterThanOrEqual(basicDeepLinksCount);
    });
  });

  it('returns case links for basic license with only read_cases capabilities', () => {
    const basicLicense = 'basic';
    const basicLinks = getDeepLinks(mockGlobalState.app.enableExperimental, basicLicense, ({
      siem: { read_cases: true, crud_cases: false },
    } as unknown) as Capabilities);

    expect(basicLinks.some((l) => l.id === SecurityPageName.case)).toBeTruthy();
  });

  it('returns case links with NO deepLinks for basic license with only read_cases capabilities', () => {
    const basicLicense = 'basic';
    const basicLinks = getDeepLinks(mockGlobalState.app.enableExperimental, basicLicense, ({
      siem: { read_cases: true, crud_cases: false },
    } as unknown) as Capabilities);

    expect(
      basicLinks.find((l) => l.id === SecurityPageName.case)?.deepLinks?.length === 0
    ).toBeTruthy();
  });

  it('returns case links with deepLinks for basic license with crud_cases capabilities', () => {
    const basicLicense = 'basic';
    const basicLinks = getDeepLinks(mockGlobalState.app.enableExperimental, basicLicense, ({
      siem: { read_cases: true, crud_cases: true },
    } as unknown) as Capabilities);

    expect(
      (basicLinks.find((l) => l.id === SecurityPageName.case)?.deepLinks?.length ?? 0) > 0
    ).toBeTruthy();
  });

  it('returns NO case links for basic license with NO read_cases capabilities', () => {
    const basicLicense = 'basic';
    const basicLinks = getDeepLinks(mockGlobalState.app.enableExperimental, basicLicense, ({
      siem: { read_cases: false, crud_cases: false },
    } as unknown) as Capabilities);

    expect(basicLinks.some((l) => l.id === SecurityPageName.case)).toBeFalsy();
  });

  it('returns case links for basic license with undefined capabilities', () => {
    const basicLicense = 'basic';
    const basicLinks = getDeepLinks(
      mockGlobalState.app.enableExperimental,
      basicLicense,
      undefined
    );

    expect(basicLinks.some((l) => l.id === SecurityPageName.case)).toBeTruthy();
  });

  it('returns case deepLinks for basic license with undefined capabilities', () => {
    const basicLicense = 'basic';
    const basicLinks = getDeepLinks(
      mockGlobalState.app.enableExperimental,
      basicLicense,
      undefined
    );

    expect(
      (basicLinks.find((l) => l.id === SecurityPageName.case)?.deepLinks?.length ?? 0) > 0
    ).toBeTruthy();
  });

  it('returns NO ueba link when enableExperimental.uebaEnabled === false', () => {
    const deepLinks = getDeepLinks(mockGlobalState.app.enableExperimental);
    expect(deepLinks.some((l) => l.id === SecurityPageName.ueba)).toBeFalsy();
  });

  it('returns ueba link when enableExperimental.uebaEnabled === true', () => {
    const deepLinks = getDeepLinks({
      ...mockGlobalState.app.enableExperimental,
      uebaEnabled: true,
    });
    expect(deepLinks.some((l) => l.id === SecurityPageName.ueba)).toBeTruthy();
  });

  describe('Detections Alerts deep links', () => {
    it('should return alerts link for basic license with only read_alerts capabilities', () => {
      const basicLicense = 'basic';
      const basicLinks = getDeepLinks(mockGlobalState.app.enableExperimental, basicLicense, ({
        siem: { read_alerts: true, crud_alerts: false },
      } as unknown) as Capabilities);

      const detectionsDeepLinks =
        basicLinks.find((l) => l.id === SecurityPageName.detections)?.deepLinks ?? [];

      expect(
        detectionsDeepLinks.length &&
          detectionsDeepLinks.some((l) => l.id === SecurityPageName.alerts)
      ).toBeTruthy();
    });

    it('should return alerts link with for basic license with crud_alerts capabilities', () => {
      const basicLicense = 'basic';
      const basicLinks = getDeepLinks(mockGlobalState.app.enableExperimental, basicLicense, ({
        siem: { read_alerts: true, crud_alerts: true },
      } as unknown) as Capabilities);

      const detectionsDeepLinks =
        basicLinks.find((l) => l.id === SecurityPageName.detections)?.deepLinks ?? [];

      expect(
        detectionsDeepLinks.length &&
          detectionsDeepLinks.some((l) => l.id === SecurityPageName.alerts)
      ).toBeTruthy();
    });

    it('should NOT return alerts link for basic license with NO read_alerts capabilities', () => {
      const basicLicense = 'basic';
      const basicLinks = getDeepLinks(mockGlobalState.app.enableExperimental, basicLicense, ({
        siem: { read_alerts: false, crud_alerts: false },
      } as unknown) as Capabilities);

      const detectionsDeepLinks =
        basicLinks.find((l) => l.id === SecurityPageName.detections)?.deepLinks ?? [];

      expect(
        detectionsDeepLinks.length &&
          detectionsDeepLinks.some((l) => l.id === SecurityPageName.alerts)
      ).toBeFalsy();
    });

    it('should return alerts link for basic license with undefined capabilities', () => {
      const basicLicense = 'basic';
      const basicLinks = getDeepLinks(
        mockGlobalState.app.enableExperimental,
        basicLicense,
        undefined
      );

      const detectionsDeepLinks =
        basicLinks.find((l) => l.id === SecurityPageName.detections)?.deepLinks ?? [];

      expect(
        detectionsDeepLinks.length &&
          detectionsDeepLinks.some((l) => l.id === SecurityPageName.alerts)
      ).toBeTruthy();
    });
  });
});
