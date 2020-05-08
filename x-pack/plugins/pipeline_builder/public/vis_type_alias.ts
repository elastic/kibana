/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { VisTypeAlias } from 'src/plugins/visualizations/public';
import { PLUGIN_ID, getBasePath } from '../common';

export const getPipelineBuilderAliasConfig = (): VisTypeAlias => ({
  aliasUrl: getBasePath(),
  name: PLUGIN_ID,
  title: i18n.translate('xpack.pipelineBuilder.visTypeAlias.title', {
    defaultMessage: 'Pipeline Builder',
  }),
  description: i18n.translate('xpack.pipelineBuilder.visTypeAlias.description', {
    defaultMessage: `Pipeline builder is for advanced querying with basic visualizations`,
  }),
  icon: 'aggregate',
  stage: 'beta',
  // appExtensions: {
  // visualizations: {
  //   docTypes: ['pipeline_builder'],
  //   searchFields: ['title^3'],
  //   toListItem(savedObject) {
  //     const { id, type, attributes } = savedObject;
  //     const { title } = attributes as { title: string };
  //     return {
  //       id,
  //       title,
  //       editUrl: getEditPath(id),
  //       icon: 'aggregate',
  //       stage: 'beta',
  //       savedObjectType: type,
  //       typeTitle: i18n.translate('xpack.pipelineBuilder.visTypeAlias.title', {
  //         defaultMessage: 'Pipeline Builder',
  //       }),
  //     };
  //   },
  // },
  // },
});
