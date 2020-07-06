/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { esdocs } from '../../../canvas_plugin_src/functions/server/esdocs';
import { FunctionHelp } from '../function_help';
import { FunctionFactory } from '../../../types';
import { ELASTICSEARCH, LUCENE } from '../../constants';

export const help: FunctionHelp<FunctionFactory<typeof esdocs>> = {
  help: i18n.translate('xpack.canvas.functions.esdocsHelpText', {
    defaultMessage:
      'Query {ELASTICSEARCH} for raw documents. Specify the fields you want to retrieve, ' +
      'especially if you are asking for a lot of rows.',
    values: {
      ELASTICSEARCH,
    },
  }),
  args: {
    query: i18n.translate('xpack.canvas.functions.esdocs.args.queryHelpText', {
      defaultMessage: 'A {LUCENE} query string.',
      values: {
        LUCENE,
      },
    }),
    count: i18n.translate('xpack.canvas.functions.esdocs.args.countHelpText', {
      defaultMessage:
        'The number of documents to retrieve. For better performance, use a smaller data set.',
    }),
    fields: i18n.translate('xpack.canvas.functions.esdocs.args.fieldsHelpText', {
      defaultMessage: 'A comma-separated list of fields. For better performance, use fewer fields.',
    }),
    index: i18n.translate('xpack.canvas.functions.esdocs.args.indexHelpText', {
      defaultMessage: 'An index or index pattern. For example, {example}.',
      values: {
        example: '`"logstash-*"`',
      },
    }),
    metaFields: i18n.translate('xpack.canvas.functions.esdocs.args.metaFieldsHelpText', {
      defaultMessage: 'Comma separated list of meta fields. For example, {example}.',
      values: {
        example: '`"_index,_type"`',
      },
    }),
    sort: i18n.translate('xpack.canvas.functions.esdocs.args.sortHelpText', {
      defaultMessage:
        'The sort direction formatted as {directions}. For example, {example1} or {example2}.',
      values: {
        directions: `\`"${['field', 'direction'].join(', ')}"\``,
        example1: `\`"${['@timestamp', 'desc'].join(', ')}"\``,
        example2: `\`"${['bytes', 'asc'].join(', ')}"\``,
      },
    }),
  },
};
