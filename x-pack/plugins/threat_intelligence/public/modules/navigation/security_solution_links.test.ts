/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { threatIntelligencePages } from './constants';
import {
  getSecuritySolutionDeepLink,
  getSecuritySolutionLink,
  getSecuritySolutionNavTab,
} from './security_solution_links';

describe('getSecuritySolutionDeepLink', () => {
  it('gets the correct deeplink properties', () => {
    const threatIntelligencePage = 'indicators';

    const link = getSecuritySolutionDeepLink(threatIntelligencePage);

    expect(link.id).toEqual(threatIntelligencePages[threatIntelligencePage].id);
    expect(link.keywords).toEqual(threatIntelligencePages[threatIntelligencePage].keywords);
    expect(link.path).toEqual(threatIntelligencePages[threatIntelligencePage].path);
    expect(link.title).toEqual(threatIntelligencePages[threatIntelligencePage].newNavigationName);
  });
});

describe('getSecuritySolutionLink', () => {
  it('gets the correct link properties', () => {
    const threatIntelligencePage = 'indicators';

    const link = getSecuritySolutionLink(threatIntelligencePage);

    expect(link.description).toEqual(threatIntelligencePages[threatIntelligencePage].description);
    expect(link.globalSearchKeywords).toEqual(
      threatIntelligencePages[threatIntelligencePage].globalSearchKeywords
    );
    expect(link.id).toEqual(threatIntelligencePages[threatIntelligencePage].id);
    expect(link.path).toEqual(threatIntelligencePages[threatIntelligencePage].path);
    expect(link.title).toEqual(threatIntelligencePages[threatIntelligencePage].newNavigationName);
  });
});

describe('getSecuritySolutionNavTab', () => {
  it('gets the correct navtab properties', () => {
    const threatIntelligencePage = 'indicators';
    const basePath = 'threat_intelligence/';

    const navTab = getSecuritySolutionNavTab(threatIntelligencePage, basePath);

    expect(navTab.disabled).toEqual(threatIntelligencePages[threatIntelligencePage].disabled);
    expect(navTab.href).toEqual(
      `${basePath}${threatIntelligencePages[threatIntelligencePage].path}`
    );
    expect(navTab.id).toEqual(threatIntelligencePages[threatIntelligencePage].id);
    expect(navTab.name).toEqual(threatIntelligencePages[threatIntelligencePage].oldNavigationName);
  });
});
