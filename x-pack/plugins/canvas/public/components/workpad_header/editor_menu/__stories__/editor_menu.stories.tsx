/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { storiesOf } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import React from 'react';
import { EmbeddableFactoryDefinition, IEmbeddable } from '@kbn/embeddable-plugin/public';
import { BaseVisType, VisTypeAlias } from '@kbn/visualizations-plugin/public';
import { EditorMenu } from '../editor_menu.component';

const testFactories: EmbeddableFactoryDefinition[] = [
  {
    type: 'ml_anomaly_swimlane',
    getDisplayName: () => 'Anomaly swimlane',
    getIconType: () => '',
    getDescription: () => 'Description for anomaly swimlane',
    isEditable: () => Promise.resolve(true),
    create: () => Promise.resolve({ id: 'swimlane_embeddable' } as IEmbeddable),
    grouping: [
      {
        id: 'ml',
        getDisplayName: () => 'machine learning',
        getIconType: () => 'machineLearningApp',
      },
    ],
  },
  {
    type: 'ml_anomaly_chart',
    getDisplayName: () => 'Anomaly chart',
    getIconType: () => '',
    getDescription: () => 'Description for anomaly chart',
    isEditable: () => Promise.resolve(true),
    create: () => Promise.resolve({ id: 'anomaly_chart_embeddable' } as IEmbeddable),
    grouping: [
      {
        id: 'ml',
        getDisplayName: () => 'machine learning',
        getIconType: () => 'machineLearningApp',
      },
    ],
  },
  {
    type: 'log_stream',
    getDisplayName: () => 'Log stream',
    getIconType: () => '',
    getDescription: () => 'Description for log stream',
    isEditable: () => Promise.resolve(true),
    create: () => Promise.resolve({ id: 'anomaly_chart_embeddable' } as IEmbeddable),
  },
];

const testVisTypes: BaseVisType[] = [
  { title: 'TSVB', icon: '', description: 'Description of TSVB', name: 'tsvb' } as BaseVisType,
  {
    titleInWizard: 'Custom visualization',
    title: 'Vega',
    icon: '',
    description: 'Description of Vega',
    name: 'vega',
  } as BaseVisType,
];

const testVisTypeAliases: VisTypeAlias[] = [
  {
    title: 'Lens',
    aliasApp: 'lens',
    aliasPath: 'path/to/lens',
    icon: 'lensApp',
    name: 'lens',
    description: 'Description of Lens app',
    stage: 'production',
  },
  {
    title: 'Maps',
    aliasApp: 'maps',
    aliasPath: 'path/to/maps',
    icon: 'gisApp',
    name: 'maps',
    description: 'Description of Maps app',
    stage: 'production',
  },
];

storiesOf('components/WorkpadHeader/EditorMenu', module)
  .add('default', () => (
    <EditorMenu
      factories={testFactories}
      promotedVisTypes={testVisTypes}
      visTypeAliases={testVisTypeAliases}
      createNewVisType={() => action('createNewVisType')}
      createNewEmbeddable={() => action('createNewEmbeddable')}
    />
  ))
  .add('dark mode', () => (
    <EditorMenu
      factories={testFactories}
      isDarkThemeEnabled
      promotedVisTypes={testVisTypes}
      visTypeAliases={testVisTypeAliases}
      createNewVisType={() => action('createNewVisType')}
      createNewEmbeddable={() => action('createNewEmbeddable')}
    />
  ));
