/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/server/mocks';
import { prepareWorkplaceState } from './utils';
import { urlTemplatePlaceholder } from '../../common/constants';
import { wsState } from './logs';

const mockedCore = coreMock.createSetup();
mockedCore.http.basePath.prepend = jest.fn((url) => encodeURIComponent(`/testA/${url}`));

describe('Graph - Sample data', () => {
  test('should prepare workspace state and add base path to url templates', () => {
    const result = prepareWorkplaceState(wsState, mockedCore);
    expect(mockedCore.http.basePath.prepend).toHaveBeenCalled();
    expect(typeof result).toBe('string');
    const parsedResult = JSON.parse(JSON.parse(result));
    expect(wsState.sampleSize).toBe(parsedResult.sampleSize);
    expect(wsState.urlTemplates).toHaveLength(parsedResult.urlTemplates.length);
    expect(parsedResult.urlTemplates[0].url.includes('testA')).toBeTruthy();
    expect(parsedResult.urlTemplates[0].url.includes(urlTemplatePlaceholder)).toBeTruthy();
  });
});
