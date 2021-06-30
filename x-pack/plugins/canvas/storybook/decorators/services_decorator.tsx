/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import {
  CanvasServiceFactory,
  CanvasServiceProvider,
  ServicesProvider,
} from '../../public/services';
import {
  findNoWorkpads,
  findSomeWorkpads,
  workpadService,
  findSomeTemplates,
  findNoTemplates,
} from '../../public/services/stubs/workpad';
import { WorkpadService } from '../../public/services/workpad';

interface Params {
  findWorkpads?: number;
  findTemplates?: boolean;
}

export const servicesContextDecorator = ({
  findWorkpads = 0,
  findTemplates: findTemplatesOption = false,
}: Params = {}) => {
  const workpadServiceFactory: CanvasServiceFactory<WorkpadService> = (): WorkpadService => ({
    ...workpadService,
    find: findWorkpads > 0 ? findSomeWorkpads(findWorkpads) : findNoWorkpads(),
    findTemplates: findTemplatesOption ? findSomeTemplates() : findNoTemplates(),
  });

  const workpad = new CanvasServiceProvider(workpadServiceFactory);
  // @ts-expect-error This is a hack at the moment, until we can get Canvas moved over to the new services architecture.
  workpad.start();

  return (story: Function) => (
    <ServicesProvider providers={{ workpad }}>{story()}</ServicesProvider>
  );
};
