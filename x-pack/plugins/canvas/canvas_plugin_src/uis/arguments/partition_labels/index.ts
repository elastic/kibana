/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { templateFromReactComponent } from '../../../../public/lib/template_from_react_component';
import { ExtendedTemplate } from './extended_template';
import { SimpleTemplate } from './simple_template';

export const partitionLabels = () => ({
  name: 'partitionLabels',
  displayName: 'partition labels',
  help: 'partition labels help',
  simpleTemplate: templateFromReactComponent(SimpleTemplate),
  template: templateFromReactComponent(ExtendedTemplate),
});
