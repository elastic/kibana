/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { SelectOperator } from '../../../common';

type OperationPrettyNames = { [operation in SelectOperator]: string };

const prettyNames: OperationPrettyNames = {
  column: i18n.translate('xpack.viz_editor.operations.column', {
    defaultMessage: 'Values',
    description: '',
  }),
  terms: i18n.translate('xpack.viz_editor.operations.terms', {
    defaultMessage: 'Top Values',
    description: '',
  }),
  count: i18n.translate('xpack.viz_editor.operations.count', {
    defaultMessage: 'Count',
    description: '',
  }),
  avg: i18n.translate('xpack.viz_editor.operations.avg', {
    defaultMessage: 'Average',
    description: '',
  }),
  cardinality: i18n.translate('xpack.viz_editor.operations.cardinality', {
    defaultMessage: 'Unique Count',
    description: '',
  }),
  sum: i18n.translate('xpack.viz_editor.operations.avg', {
    defaultMessage: 'Sum',
    description: '',
  }),
  date_histogram: i18n.translate('xpack.viz_editor.operations.date_histogram', {
    defaultMessage: 'Date histogram',
    description: '',
  }),
};

export function operationToName(operation: SelectOperator): string {
  return prettyNames[operation];
}
