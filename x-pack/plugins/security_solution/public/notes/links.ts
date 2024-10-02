/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { NOTES_PATH, SecurityPageName, SERVER_APP_ID } from '../../common/constants';
import { NOTES } from '../app/translations';
import type { LinkItem } from '../common/links/types';

export const links: LinkItem = {
  id: SecurityPageName.notes,
  title: NOTES,
  path: NOTES_PATH,
  capabilities: [`${SERVER_APP_ID}.show`],
  globalSearchKeywords: [
    i18n.translate('xpack.securitySolution.appLinks.notes', {
      defaultMessage: 'Notes',
    }),
  ],
  links: [],
  experimentalKey: 'securitySolutionNotesEnabled',
};
