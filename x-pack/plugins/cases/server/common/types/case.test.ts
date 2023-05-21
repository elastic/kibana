/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omit } from 'lodash';
import { CaseStatuses } from '@kbn/cases-components';
import { ConnectorTypes, CaseSeverity, SECURITY_SOLUTION_OWNER } from '../../../common';
import { CaseTransformedAttributesRt, getPartialCaseTransformedAttributesRt } from './case';

describe('getPartialCaseTransformedAttributesRt', () => {
  const theCaseAttributes = {
    closed_at: null,
    closed_by: null,
    connector: {
      id: 'none',
      name: 'none',
      type: ConnectorTypes.none,
      fields: null,
    },
    created_at: '2019-11-25T21:54:48.952Z',
    created_by: {
      full_name: 'elastic',
      email: 'testemail@elastic.co',
      username: 'elastic',
    },
    severity: CaseSeverity.LOW,
    duration: null,
    description: 'This is a brand new case of a bad meanie defacing data',
    external_service: null,
    title: 'Super Bad Security Issue',
    status: CaseStatuses.open,
    tags: ['defacement'],
    updated_at: '2019-11-25T21:54:48.952Z',
    updated_by: {
      full_name: 'elastic',
      email: 'testemail@elastic.co',
      username: 'elastic',
    },
    settings: {
      syncAlerts: true,
    },
    owner: SECURITY_SOLUTION_OWNER,
    assignees: [],
  };
  const caseTransformedAttributesProps = CaseTransformedAttributesRt.types.reduce(
    (acc, type) => ({ ...acc, ...type.props }),
    {}
  );

  const type = getPartialCaseTransformedAttributesRt();

  it.each(Object.keys(caseTransformedAttributesProps))('does not throw if %s is omitted', (key) => {
    const theCase = omit(theCaseAttributes, key);
    const decodedRes = type.decode(theCase);

    expect(decodedRes._tag).toEqual('Right');
    // @ts-expect-error: the check above ensures that right exists
    expect(decodedRes.right).toEqual(theCase);
  });

  it('removes excess properties', () => {
    const decodedRes = type.decode({ description: 'test', 'not-exists': 'excess' });

    expect(decodedRes._tag).toEqual('Right');
    // @ts-expect-error: the check above ensures that right exists
    expect(decodedRes.right).toEqual({ description: 'test' });
  });
});
