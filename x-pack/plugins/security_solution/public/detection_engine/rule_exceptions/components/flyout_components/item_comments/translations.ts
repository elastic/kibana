/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const COMMENTS_SECTION_TITLE = (comments: number) =>
  i18n.translate(
    'xpack.securitySolution.rule_exceptions.flyoutComponents.itemComments.commentsTitle',
    {
      values: { comments },
      defaultMessage: 'Add comments ({comments})',
    }
  );
