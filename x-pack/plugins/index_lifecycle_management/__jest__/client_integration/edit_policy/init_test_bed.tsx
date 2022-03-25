/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { registerTestBed, TestBedConfig } from '@kbn/test-jest-helpers';
import { docLinksServiceMock } from 'src/core/public/mocks';

import '../helpers/global_mocks';

import { licensingMock } from '../../../../licensing/public/mocks';
import { EditPolicy } from '../../../public/application/sections/edit_policy';
import { KibanaContextProvider } from '../../../public/shared_imports';
import { AppServicesContext } from '../../../public/types';
import { createBreadcrumbsMock } from '../../../public/application/services/breadcrumbs.mock';
import { POLICY_NAME } from './constants';

const getTestBedConfig = (testBedConfigArgs?: Partial<TestBedConfig>): TestBedConfig => {
  return {
    memoryRouter: {
      initialEntries: [`/policies/edit/${POLICY_NAME}`],
      componentRoutePath: `/policies/edit/:policyName`,
    },
    ...testBedConfigArgs,
  };
};

const breadcrumbService = createBreadcrumbsMock();

const EditPolicyContainer = ({ appServicesContext, ...rest }: any) => {
  return (
    <KibanaContextProvider
      services={{
        breadcrumbService,
        license: licensingMock.createLicense({ license: { type: 'enterprise' } }),
        docLinks: docLinksServiceMock.createStartContract(),
        getUrlForApp: () => {},
        ...appServicesContext,
      }}
    >
      <EditPolicy {...rest} />
    </KibanaContextProvider>
  );
};

export const initTestBed = (arg?: {
  appServicesContext?: Partial<AppServicesContext>;
  testBedConfig?: Partial<TestBedConfig>;
}) => {
  const { testBedConfig: testBedConfigArgs, ...rest } = arg || {};
  return registerTestBed(EditPolicyContainer, getTestBedConfig(testBedConfigArgs))(rest);
};
