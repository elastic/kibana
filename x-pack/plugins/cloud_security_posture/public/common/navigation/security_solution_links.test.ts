/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cloudPosturePages } from './constants';
import { getSecuritySolutionLinks } from './security_solution_links';
import { Chance } from 'chance';
import type { CspPage } from './types';

const chance = new Chance();

describe('getSecuritySolutionLinks', () => {
  it('gets the correct link properties', () => {
    const cspPage = chance.pickone<CspPage>(['dashboard', 'findings', 'benchmarks', 'rules']);

    const links = getSecuritySolutionLinks(cspPage);

    expect(links.id).toEqual(cloudPosturePages[cspPage].id);
    expect(links.path).toEqual(cloudPosturePages[cspPage].path);
    expect(links.title).toEqual(cloudPosturePages[cspPage].name);
  });

  it('de-structures extensions correctly', () => {
    const cspPage = chance.pickone<CspPage>(['dashboard', 'findings', 'benchmarks', 'rules']);
    const overwrittenTitle = chance.word();
    const extensions = {
      [cloudPosturePages[cspPage].id]: { title: overwrittenTitle },
    };

    const links = getSecuritySolutionLinks(cspPage, extensions);

    expect(links.id).toEqual(cloudPosturePages[cspPage].id);
    expect(links.path).toEqual(cloudPosturePages[cspPage].path);
    expect(links.title).toEqual(overwrittenTitle);
  });
});
