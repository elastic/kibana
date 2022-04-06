/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { AppContextTestRender } from '../../../../../../common/mock/endpoint';
import { createFleetContextRendererMock, generateFleetPackageInfo } from '../mocks';
import { EndpointPackageCustomExtension } from './endpoint_package_custom_extension';

describe('When displaying the EndpointPackageCustomExtension fleet UI extension', () => {
  let render: () => ReturnType<AppContextTestRender['render']>;
  let renderResult: ReturnType<AppContextTestRender['render']>;

  beforeEach(() => {
    const mockedTestContext = createFleetContextRendererMock();
    render = () => {
      renderResult = mockedTestContext.render(
        <EndpointPackageCustomExtension
          pkgkey="endpoint-8.2.0"
          packageInfo={generateFleetPackageInfo()}
        />
      );

      return renderResult;
    };

    // FIXME:PT mock APIs
  });

  it.each([
    ['trusted apps', 'trustedApps-fleetCard'],
    ['event filters', 'eventFilters-fleetCard'],
    ['host isolation exceptions', 'hostIsolationExceptions-fleetCard'],
    ['bLocklist', 'blocklists-fleetCard'],
  ])('should show %s card', (_, testId) => {
    render();

    expect(renderResult.getByTestId(testId)).toBeTruthy();
  });

  it.todo('should show Host Isolations Exceptions if license is not enterprise but entries exist');

  it.todo(
    'should NOT show Host Isolation Exceptions if license is not Enterprise and no entries exist'
  );
});
