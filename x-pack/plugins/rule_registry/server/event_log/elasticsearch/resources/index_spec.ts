/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EventLogDefinition, IndexNames, IlmPolicy, defaultIlmPolicy } from '../../common';
import {
  ComponentTemplate,
  IndexTemplate,
  createComponentTemplate,
  createIndexTemplate,
} from './index_templates';

export interface IndexSpec {
  indexNames: IndexNames;

  applicationDefinedTemplate: ComponentTemplate;
  userDefinedTemplate: ComponentTemplate;
  userDefinedSpaceAwareTemplate: ComponentTemplate;
  indexTemplate: IndexTemplate;

  ilmPolicy: IlmPolicy;
}

export const createIndexSpec = (
  logDefinition: EventLogDefinition<any>,
  indexPrefix: string,
  kibanaSpaceId: string
): IndexSpec => {
  const { logName, templates, ilmPolicy } = logDefinition;
  const { applicationDefinedComponentTemplate, indexTemplate } = templates;

  const indexNames = IndexNames.create({
    indexPrefix,
    logName,
    kibanaSpaceId,
  });

  return {
    indexNames,
    applicationDefinedTemplate: createComponentTemplate(applicationDefinedComponentTemplate),
    userDefinedTemplate: createComponentTemplate({}),
    userDefinedSpaceAwareTemplate: createComponentTemplate({}),
    indexTemplate: createIndexTemplate(indexNames, indexTemplate),
    ilmPolicy: ilmPolicy ?? defaultIlmPolicy,
  };
};
