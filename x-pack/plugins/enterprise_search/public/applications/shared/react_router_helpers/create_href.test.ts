/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockHistory } from '../../__mocks__/react_router';

import { httpServiceMock } from '@kbn/core/public/mocks';

import { createHref } from '.';

describe('createHref', () => {
  const dependencies = {
    history: mockHistory,
    http: httpServiceMock.createSetupContract(),
  };

  it('generates a path with the React Router basename included', () => {
    expect(createHref('/test', dependencies)).toEqual('/app/enterprise_search/test');
  });

  describe('shouldNotCreateHref', () => {
    const options = { shouldNotCreateHref: true };

    it('does not include the router basename,', () => {
      expect(createHref('/test', dependencies, options)).toEqual('/test');
    });

    it('does include the Kibana basepath,', () => {
      const http = httpServiceMock.createSetupContract({ basePath: '/xyz/s/custom-space' });
      const basePathDeps = { ...dependencies, http };

      expect(createHref('/test', basePathDeps, options)).toEqual('/xyz/s/custom-space/test');
    });
  });
});
