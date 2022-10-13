/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { monaco } from '@kbn/monaco';
import { UrlDrilldownGlobalScope } from '@kbn/ui-actions-enhanced-plugin/public';
import type { UrlTemplateEditorVariable } from '@kbn/kibana-react-plugin/public';
import { txtValue } from './i18n';

const kind = monaco.languages.CompletionItemKind.Constant;
const sortPrefix = '3.';

export const getGlobalVariableList = (
  values: UrlDrilldownGlobalScope
): UrlTemplateEditorVariable[] => {
  const globalVariables: UrlTemplateEditorVariable[] = [
    {
      label: 'kibanaUrl',
      sortText: sortPrefix + 'kibanaUrl',
      title: i18n.translate('xpack.urlDrilldown.global.kibanaUrl.documentation.title', {
        defaultMessage: 'Link to Kibana homepage.',
      }),
      documentation:
        i18n.translate('xpack.urlDrilldown.global.kibanaUrl.documentation', {
          defaultMessage:
            'Kibana base URL. Useful for creating URL drilldowns that navigate within Kibana.',
        }) +
        '\n\n' +
        txtValue(values.kibanaUrl),
      kind,
    },
  ];

  return globalVariables;
};
