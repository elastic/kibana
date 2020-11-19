/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { templateFromReactComponent } from '../../../../public/lib/template_from_react_component';
import { SimpleTemplate } from './simple_template';
import { ExtendedTemplate } from './extended_template';
import { ArgumentStrings } from '../../../../i18n';

const { AxisConfig: strings } = ArgumentStrings;

export const axisConfig = () => ({
  name: 'axisConfig',
  displayName: strings.getDisplayName(),
  help: strings.getHelp(),
  simpleTemplate: templateFromReactComponent(SimpleTemplate),
  template: templateFromReactComponent(ExtendedTemplate),
});
