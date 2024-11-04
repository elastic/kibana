/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { DecoratorFn } from '@storybook/react';
import { I18nProvider } from '@kbn/i18n-react';

import { LegacyServicesProvider } from '../../public/services/legacy';
import { setStubKibanaServices } from '../../public/services/mocks';

export const servicesContextDecorator = (): DecoratorFn => {
  return (story: Function, storybook) => {
    if (process.env.JEST_WORKER_ID !== undefined) {
      storybook.args.useStaticData = true;
    }

    return <I18nProvider>{story()}</I18nProvider>;
  };
};

export const legacyContextDecorator = () => {
  setStubKibanaServices();

  return (story: Function) => <LegacyServicesProvider>{story()}</LegacyServicesProvider>;
};
