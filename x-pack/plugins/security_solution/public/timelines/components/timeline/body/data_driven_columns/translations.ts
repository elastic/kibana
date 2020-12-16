/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const YOU_ARE_IN_A_TABLE_CELL = ({ column, row }: { column: number; row: number }) =>
  i18n.translate('xpack.securitySolution.timeline.youAreInATableCellScreenReaderOnly', {
    values: { column, row },
    defaultMessage: 'You are in a table cell. row: {row}, column: {column}',
  });
