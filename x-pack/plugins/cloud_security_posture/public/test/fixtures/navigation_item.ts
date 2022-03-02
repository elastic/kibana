/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import Chance from 'chance';
import type { CspNavigationItem } from '../../common/navigation/types';

type CreateNavigationItemFixtureInput = { chance?: Chance.Chance } & Partial<CspNavigationItem>;
export const createNavigationItemFixture = ({
  chance = new Chance(),
  name = chance.word(),
  path = `/${chance.word()}`,
  disabled = undefined,
}: CreateNavigationItemFixtureInput = {}): CspNavigationItem => ({
  name,
  path,
  disabled,
});
