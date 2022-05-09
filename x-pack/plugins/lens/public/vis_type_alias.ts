/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { VisTypeAlias } from '@kbn/visualizations-plugin/public';
import { getBasePath, getEditPath } from '../common/constants';

export const getLensAliasConfig = (): VisTypeAlias => ({
  aliasPath: getBasePath(),
  aliasApp: 'lens',
  name: 'lens',
  promotion: true,
  title: i18n.translate('xpack.lens.visTypeAlias.title', {
    defaultMessage: 'Lens',
  }),
  description: i18n.translate('xpack.lens.visTypeAlias.description', {
    defaultMessage:
      'Create visualizations with our drag and drop editor. Switch between visualization types at any time.',
  }),
  note: i18n.translate('xpack.lens.visTypeAlias.note', {
    defaultMessage: 'Recommended for most users.',
  }),
  icon: 'lensApp',
  stage: 'production',
  appExtensions: {
    visualizations: {
      docTypes: ['lens'],
      searchFields: ['title^3'],
      toListItem(savedObject) {
        const { id, type, attributes } = savedObject;
        const { title, description } = attributes as { title: string; description?: string };
        return {
          id,
          title,
          description,
          editUrl: getEditPath(id),
          editApp: 'lens',
          icon: 'lensApp',
          stage: 'production',
          savedObjectType: type,
          type: 'lens',
          typeTitle: i18n.translate('xpack.lens.visTypeAlias.type', { defaultMessage: 'Lens' }),
        };
      },
    },
  },
});
