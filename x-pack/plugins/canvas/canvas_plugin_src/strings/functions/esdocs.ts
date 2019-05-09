/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { esdocs } from '../../functions/server/esdocs';
import { FunctionHelp } from '.';
import { FunctionFactory } from '../../functions/types';

export const help: FunctionHelp<FunctionFactory<typeof esdocs>> = {
  help: i18n.translate('xpack.canvas.functions.esdocsHelpText', {
    defaultMessage:
      'Query elasticsearch and get back raw documents. We recommend you specify the fields you want, especially if you are going to ask for a lot of rows',
  }),
  args: {
    index: i18n.translate('xpack.canvas.functions.esdocs.args.indexHelpText', {
      defaultMessage: 'Specify an index pattern. Eg "logstash-*"',
    }),
    query: i18n.translate('xpack.canvas.functions.esdocs.args.queryHelpText', {
      defaultMessage: 'A Lucene query string',
    }),
    sort: i18n.translate('xpack.canvas.functions.esdocs.args.sortHelpText', {
      defaultMessage:
        'Sort directions as "field, direction". Eg "@timestamp, desc" or "bytes, asc"',
    }),
    fields: i18n.translate('xpack.canvas.functions.esdocs.args.fieldsHelpText', {
      defaultMessage: 'Comma separated list of fields. Fewer fields will perform better',
    }),
    metaFields: i18n.translate('xpack.canvas.functions.esdocs.args.metaFieldsHelpText', {
      defaultMessage: 'Comma separated list of meta fields, eg "_index,_type"',
    }),
    count: i18n.translate('xpack.canvas.functions.esdocs.args.countHelpText', {
      defaultMessage: 'The number of docs to pull back. Smaller numbers perform better',
    }),
  },
};
