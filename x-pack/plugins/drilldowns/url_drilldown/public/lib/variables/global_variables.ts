/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { monaco } from '@kbn/monaco';
import type { UrlTemplateEditorVariable } from '../../../../../../../src/plugins/kibana_react/public';

const kind = monaco.languages.CompletionItemKind.Constant;
const sortPrefix = '3.';

const globalVariables: readonly UrlTemplateEditorVariable[] = [
  {
    label: 'kibanaUrl',
    sortText: sortPrefix + 'kibanaUrl',
    title: i18n.translate('xpack.urlDrilldown.global.kibanaUrl.documentation.title', {
      defaultMessage: 'Link to Kibana homepage.',
    }),
    documentation: i18n.translate('xpack.urlDrilldown.global.kibanaUrl.documentation', {
      defaultMessage:
        'Kibana base URL. Useful for creating URL drilldowns that navigate within Kibana.',
    }),
    kind,
  },
];

export const getGlobalVariableList = (): UrlTemplateEditorVariable[] => {
  return [...globalVariables];
};
