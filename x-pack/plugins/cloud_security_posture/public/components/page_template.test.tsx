/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import Chance from 'chance';
import { createNavigationItemFixture } from '../test/fixtures/navigationItem';
import { getSideNavItems } from './page_template';

const chance = new Chance();

describe('getSideNavItems', () => {
  it('maps navigation items to side navigation items', () => {
    const navigationItem = createNavigationItemFixture();
    const id = chance.word();
    const sideNavItems = getSideNavItems({ [id]: navigationItem });

    expect(sideNavItems).toHaveLength(1);
    expect(sideNavItems[0]).toMatchObject({
      id,
      name: navigationItem.name,
      renderItem: expect.any(Function),
    });
  });

  it('does not map disabled navigation items to side navigation items', () => {
    const navigationItem = createNavigationItemFixture({ disabled: true });
    const id = chance.word();
    const sideNavItems = getSideNavItems({ [id]: navigationItem });
    expect(sideNavItems).toHaveLength(0);
  });
});
