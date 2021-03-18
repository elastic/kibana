/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as React from 'react';
import { useDrilldownManager } from '../context';
import { TemplateList } from './template_list';

export const TemplatePicker: React.FC = () => {
  const drilldowns = useDrilldownManager();

  const { templates } = drilldowns.deps;

  if (!templates || !templates.length) return null;

  return <TemplateList items={templates} />;
};
