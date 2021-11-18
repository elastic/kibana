/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { parse } from 'query-string';

import type { PackagePolicy, OnSaveQueryParamKeys } from '../../../../types';

import { appendOnSaveQueryParamsToPath } from './';

const mockPolicy: PackagePolicy = { policy_id: '1234' } as PackagePolicy;

function parseHref(href: string) {
  const [basePath, queryString] = href.split('?');
  const parsedQueryString = parse(queryString);

  return [basePath, parsedQueryString];
}
describe('appendOnSaveQueryParamsToPath', () => {
  it('should do nothing if no paramsToApply provided', () => {
    expect(
      appendOnSaveQueryParamsToPath({ path: '/hello', policy: mockPolicy, paramsToApply: [] })
    ).toEqual('/hello');
  });
  it('should do nothing if all params set to false', () => {
    const options = {
      path: '/hello',
      policy: mockPolicy,
      mappingOptions: {
        showAddAgentHelp: false,
        openEnrollmentFlyout: false,
      },
      paramsToApply: ['showAddAgentHelp', 'openEnrollmentFlyout'] as OnSaveQueryParamKeys[],
    };
    expect(appendOnSaveQueryParamsToPath(options)).toEqual('/hello');
  });

  it('should append query params if set to true', () => {
    const options = {
      path: '/hello',
      policy: mockPolicy,
      mappingOptions: {
        showAddAgentHelp: true,
        openEnrollmentFlyout: true,
      },
      paramsToApply: ['showAddAgentHelp', 'openEnrollmentFlyout'] as OnSaveQueryParamKeys[],
    };

    const hrefOut = appendOnSaveQueryParamsToPath(options);
    const [basePath, qs] = parseHref(hrefOut);
    expect(basePath).toEqual('/hello');
    expect(qs).toEqual({ showAddAgentHelp: 'true', openEnrollmentFlyout: 'true' });
  });
  it('should append query params if set to true (existing query string)', () => {
    const options = {
      path: '/hello?world=1',
      policy: mockPolicy,
      mappingOptions: {
        showAddAgentHelp: true,
        openEnrollmentFlyout: true,
      },
      paramsToApply: ['showAddAgentHelp', 'openEnrollmentFlyout'] as OnSaveQueryParamKeys[],
    };

    const hrefOut = appendOnSaveQueryParamsToPath(options);
    const [basePath, qs] = parseHref(hrefOut);
    expect(basePath).toEqual('/hello');
    expect(qs).toEqual({ showAddAgentHelp: 'true', openEnrollmentFlyout: 'true', world: '1' });
  });

  it('should append renamed param', () => {
    const options = {
      path: '/hello',
      policy: mockPolicy,
      mappingOptions: {
        showAddAgentHelp: { renameKey: 'renamedKey' },
      },
      paramsToApply: ['showAddAgentHelp'] as OnSaveQueryParamKeys[],
    };

    const hrefOut = appendOnSaveQueryParamsToPath(options);
    const [basePath, qs] = parseHref(hrefOut);
    expect(basePath).toEqual('/hello');
    expect(qs).toEqual({ renamedKey: 'true' });
  });

  it('should append renamed param (existing param)', () => {
    const options = {
      path: '/hello?world=1',
      policy: mockPolicy,
      mappingOptions: {
        showAddAgentHelp: { renameKey: 'renamedKey' },
      },
      paramsToApply: ['showAddAgentHelp'] as OnSaveQueryParamKeys[],
    };

    const hrefOut = appendOnSaveQueryParamsToPath(options);
    const [basePath, qs] = parseHref(hrefOut);
    expect(basePath).toEqual('/hello');
    expect(qs).toEqual({ renamedKey: 'true', world: '1' });
  });

  it('should append renamed param and policyId', () => {
    const options = {
      path: '/hello',
      policy: mockPolicy,
      mappingOptions: {
        showAddAgentHelp: { renameKey: 'renamedKey', policyIdAsValue: true },
      },
      paramsToApply: ['showAddAgentHelp'] as OnSaveQueryParamKeys[],
    };

    const hrefOut = appendOnSaveQueryParamsToPath(options);
    const [basePath, qs] = parseHref(hrefOut);
    expect(basePath).toEqual('/hello');
    expect(qs).toEqual({ renamedKey: mockPolicy.policy_id });
  });

  it('should append renamed param and policyId (existing param)', () => {
    const options = {
      path: '/hello?world=1',
      policy: mockPolicy,
      mappingOptions: {
        showAddAgentHelp: { renameKey: 'renamedKey', policyIdAsValue: true },
      },
      paramsToApply: ['showAddAgentHelp'] as OnSaveQueryParamKeys[],
    };

    const hrefOut = appendOnSaveQueryParamsToPath(options);
    const [basePath, qs] = parseHref(hrefOut);
    expect(basePath).toEqual('/hello');
    expect(qs).toEqual({ renamedKey: mockPolicy.policy_id, world: '1' });
  });

  it('should append renamed params and policyIds (existing param)', () => {
    const options = {
      path: '/hello?world=1',
      policy: mockPolicy,
      mappingOptions: {
        showAddAgentHelp: { renameKey: 'renamedKey', policyIdAsValue: true },
        openEnrollmentFlyout: { renameKey: 'renamedKey2', policyIdAsValue: true },
      },
      paramsToApply: ['showAddAgentHelp', 'openEnrollmentFlyout'] as OnSaveQueryParamKeys[],
    };

    const hrefOut = appendOnSaveQueryParamsToPath(options);
    const [basePath, qs] = parseHref(hrefOut);
    expect(basePath).toEqual('/hello');
    expect(qs).toEqual({
      renamedKey: mockPolicy.policy_id,
      renamedKey2: mockPolicy.policy_id,
      world: '1',
    });
  });
});
