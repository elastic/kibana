/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const txtTag = i18n.translate('xpack.tags.tag_table.tag', {
  defaultMessage: 'Tag',
});

export const txtTitle = i18n.translate('xpack.tags.tag_table.title', {
  defaultMessage: 'Title',
});

export const txtDescription = i18n.translate('xpack.tags.tag_table.description', {
  defaultMessage: 'Description',
});

export const txtActions = i18n.translate('xpack.tags.tag_table.actions', {
  defaultMessage: 'Actions',
});

export const txtEditSomething = (something: string) =>
  i18n.translate('xpack.tags.tag_table.editSomething', {
    defaultMessage: 'Edit {something}',
    values: { something },
  });

export const txtDeleteSomething = (something: string) =>
  i18n.translate('xpack.tags.tag_table.deleteSomething', {
    defaultMessage: 'Delete {something}',
    values: { something },
  });
