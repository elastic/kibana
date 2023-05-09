/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import type { Adapters, InspectorViewDescription } from '@kbn/inspector-plugin/public';
import { getVisualizationInspectorViewComponentWrapper } from './visualization_inspector_view_wrapper';

export const getVisualizationInspectorViewDescription = (): InspectorViewDescription => ({
  title: i18n.translate('securitySolution.inspector.table.dataTitle', {
    defaultMessage: 'Visualization',
  }),
  order: 100,
  help: i18n.translate('securitySolution.inspector.table.dataDescriptionTooltip', {
    defaultMessage: 'View the configurations behind the visualization',
  }),
  shouldShow(adapters: Adapters) {
    // return Boolean(adapters.expression);
    return true;
  },
  component: getVisualizationInspectorViewComponentWrapper(),
});
