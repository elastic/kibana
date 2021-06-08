/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CasesActions } from './cases';

const version = '1.0.0-zeta1';

describe('#get', () => {
  it.each`
    operation
    ${null}
    ${undefined}
    ${''}
    ${1}
    ${true}
    ${{}}
  `(`operation of ${JSON.stringify('$operation')}`, ({ operation }) => {
    const actions = new CasesActions(version);
    expect(() => actions.get('owner', operation)).toThrowErrorMatchingSnapshot();
  });

  it.each`
    owner
    ${null}
    ${undefined}
    ${''}
    ${1}
    ${true}
    ${{}}
  `(`owner of ${JSON.stringify('$owner')}`, ({ owner }) => {
    const actions = new CasesActions(version);
    expect(() => actions.get(owner, 'operation')).toThrowErrorMatchingSnapshot();
  });

  it('returns `cases:${owner}/${operation}`', () => {
    const alertingActions = new CasesActions(version);
    expect(alertingActions.get('security', 'bar-operation')).toBe(
      'cases:1.0.0-zeta1:security/bar-operation'
    );
  });
});
