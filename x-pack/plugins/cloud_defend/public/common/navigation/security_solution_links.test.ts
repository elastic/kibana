/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cloudDefendPages } from './constants';
import { getSecuritySolutionLink, getSecuritySolutionNavTab } from './security_solution_links';
import { Chance } from 'chance';
import type { CloudDefendPage } from './types';

const chance = new Chance();

describe('getSecuritySolutionLink', () => {
  it('gets the correct link properties', () => {
    const cloudDefendPage = chance.pickone<CloudDefendPage>(['policies']);

    const link = getSecuritySolutionLink(cloudDefendPage);

    expect(link.id).toEqual(cloudDefendPages[cloudDefendPage].id);
    expect(link.path).toEqual(cloudDefendPages[cloudDefendPage].path);
    expect(link.title).toEqual(cloudDefendPages[cloudDefendPage].name);
  });
});

describe('getSecuritySolutionNavTab', () => {
  it('gets the correct nav tab properties', () => {
    const cloudDefendPage = chance.pickone<CloudDefendPage>(['policies']);
    const basePath = chance.word();

    const navTab = getSecuritySolutionNavTab(cloudDefendPage, basePath);

    expect(navTab.id).toEqual(cloudDefendPages[cloudDefendPage].id);
    expect(navTab.name).toEqual(cloudDefendPages[cloudDefendPage].name);
    expect(navTab.href).toEqual(`${basePath}${cloudDefendPages[cloudDefendPage].path}`);
    expect(navTab.disabled).toEqual(!!cloudDefendPages[cloudDefendPage].disabled);
  });
});
