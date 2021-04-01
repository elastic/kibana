/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from 'react-dom/test-utils';
import { i18nTexts } from '../../../../public/application/sections/edit_policy/i18n_texts';

import { EditPolicyTestBed, setup } from '../edit_policy.helpers';
import { setupEnvironment } from '../../helpers/setup_environment';

describe('<EditPolicy /> timing validation', () => {
  let testBed: EditPolicyTestBed;
  let runTimers: () => void;
  const { server, httpRequestsMockHelpers } = setupEnvironment();

  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
    server.restore();
  });

  beforeEach(async () => {
    httpRequestsMockHelpers.setLoadPolicies([]);

    httpRequestsMockHelpers.setListNodes({
      nodesByRoles: { data: ['node1'] },
      nodesByAttributes: { 'attribute:true': ['node1'] },
      isUsingDeprecatedDataRoleConfig: false,
    });

    httpRequestsMockHelpers.setLoadSnapshotPolicies([]);

    httpRequestsMockHelpers.setListSnapshotRepos({ repositories: ['my-repo'] });

    await act(async () => {
      testBed = await setup();
    });

    const { component, actions } = testBed;
    component.update();
    await actions.setPolicyName('mypolicy');

    ({ runTimers } = testBed);
  });

  [
    {
      name: `doesn't allow empty timing`,
      value: '',
      error: [i18nTexts.editPolicy.errors.numberRequired],
    },
    {
      name: `allows 0 for timing`,
      value: '0',
      error: [],
    },
    {
      name: `doesn't allow -1 for timing`,
      value: '-1',
      error: [i18nTexts.editPolicy.errors.nonNegativeNumberRequired],
    },
    {
      name: `doesn't allow decimals for timing (with dot)`,
      value: '5.5',
      error: [i18nTexts.editPolicy.errors.integerRequired],
    },
    {
      name: `doesn't allow decimals for timing (with comma)`,
      value: '5,5',
      error: [i18nTexts.editPolicy.errors.integerRequired],
    },
  ].forEach((testConfig: { name: string; value: string; error: string[] }) => {
    ['warm', 'cold', 'delete', 'frozen'].forEach((phase: string) => {
      const { name, value, error } = testConfig;
      test(`${phase}: ${name}`, async () => {
        const { actions } = testBed;
        await actions[phase as 'warm' | 'cold' | 'delete' | 'frozen'].enable(true);
        await actions[phase as 'warm' | 'cold' | 'delete' | 'frozen'].setMinAgeValue(value);

        runTimers();

        actions.expectErrorMessages(error);
      });
    });
  });
});
