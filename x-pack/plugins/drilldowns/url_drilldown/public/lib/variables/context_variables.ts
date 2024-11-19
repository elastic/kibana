/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { monaco } from '@kbn/monaco';
import { getFlattenedObject } from '@kbn/std';
import type { Filter, AggregateQuery, Query, TimeRange } from '@kbn/es-query';
import type {
  EmbeddableApiContext,
  HasParentApi,
  HasUniqueId,
  PublishesPanelTitle,
  PublishesSavedObjectId,
  PublishesUnifiedSearch,
  PublishesDataViews,
} from '@kbn/presentation-publishing';
import { getPanelTitle } from '@kbn/presentation-publishing';
import type { UrlTemplateEditorVariable } from '@kbn/kibana-react-plugin/public';
import { txtValue } from './i18n';
import { deleteUndefinedKeys } from './util';
import type { ActionFactoryContext } from '../url_drilldown';

/**
 * Part of context scope extracted from an api
 * Expose on the scope as: `{{context.panel.id}}`, `{{context.panel.filters.[0]}}`
 */
interface PanelValues {
  /**
   * ID of the api panel.
   */
  id?: string;

  /**
   * Title of the api panel.
   */
  title?: string;

  /**
   * In case panel supports only 1 index pattern.
   */
  indexPatternId?: string;

  /**
   * In case panel supports more then 1 index pattern.
   */
  indexPatternIds?: string[];

  query?: Query | AggregateQuery;
  filters?: Filter[];
  timeRange?: TimeRange;
  savedObjectId?: string;
}

export interface ContextValues {
  panel: PanelValues;
}

export const getContextScopeValues = (context: Partial<EmbeddableApiContext>): ContextValues => {
  if (!context.embeddable)
    throw new Error(
      "UrlDrilldown [getContextScope] can't build scope because embeddable object is missing in context"
    );
  const api = context.embeddable as Partial<
    HasUniqueId &
      PublishesPanelTitle &
      PublishesSavedObjectId &
      PublishesUnifiedSearch &
      PublishesDataViews &
      HasParentApi<Partial<PublishesUnifiedSearch>>
  >;
  const dataViewIds = api.dataViews?.value
    ? (api.dataViews?.value.map((dataView) => dataView.id).filter(Boolean) as string[])
    : [];

  return {
    panel: deleteUndefinedKeys({
      id: api.uuid,
      title: getPanelTitle(api),
      savedObjectId: api.savedObjectId?.value,
      query: api.parentApi?.query$?.value,
      timeRange: api.timeRange$?.value ?? api.parentApi?.timeRange$?.value,
      filters: api.parentApi?.filters$?.value,
      indexPatternIds: dataViewIds.length > 1 ? dataViewIds : undefined,
      indexPatternId: dataViewIds.length === 1 ? dataViewIds[0] : undefined,
    }),
  };
};

type VariableDescription = Pick<UrlTemplateEditorVariable, 'title' | 'documentation'>;

const variableDescriptions: Record<string, undefined | VariableDescription> = {
  id: {
    title: i18n.translate('xpack.urlDrilldown.context.panel.id.title', {
      defaultMessage: 'Panel ID.',
    }),
    documentation: i18n.translate('xpack.urlDrilldown.context.panel.id.documentation', {
      defaultMessage: 'ID of the panel where drilldown is executed.',
    }),
  },
  title: {
    title: i18n.translate('xpack.urlDrilldown.context.panel.title.title', {
      defaultMessage: 'Panel title.',
    }),
    documentation: i18n.translate('xpack.urlDrilldown.context.panel.title.documentation', {
      defaultMessage: 'Title of the panel where drilldown is executed.',
    }),
  },
  filters: {
    title: i18n.translate('xpack.urlDrilldown.context.panel.filters.title', {
      defaultMessage: 'Panel filters.',
    }),
    documentation: i18n.translate('xpack.urlDrilldown.context.panel.filters.documentation', {
      defaultMessage: 'List of Kibana filters applied to a panel.',
    }),
  },
  'query.query': {
    title: i18n.translate('xpack.urlDrilldown.context.panel.query.query.title', {
      defaultMessage: 'Query string.',
    }),
  },
  'query.language': {
    title: i18n.translate('xpack.urlDrilldown.context.panel.query.language.title', {
      defaultMessage: 'Query language.',
    }),
  },
  'timeRange.from': {
    title: i18n.translate('xpack.urlDrilldown.context.panel.timeRange.from.title', {
      defaultMessage: 'Time picker "from" value.',
    }),
  },
  'timeRange.to': {
    title: i18n.translate('xpack.urlDrilldown.context.panel.timeRange.to.title', {
      defaultMessage: 'Time picker "to" value.',
    }),
  },
  indexPatternId: {
    title: i18n.translate('xpack.urlDrilldown.context.panel.timeRange.indexPatternId.title', {
      defaultMessage: 'Index pattern ID.',
    }),
    documentation: i18n.translate(
      'xpack.urlDrilldown.context.panel.timeRange.indexPatternId.documentation',
      {
        defaultMessage: 'First index pattern ID used by the panel.',
      }
    ),
  },
  indexPatternIds: {
    title: i18n.translate('xpack.urlDrilldown.context.panel.timeRange.indexPatternIds.title', {
      defaultMessage: 'Index pattern IDs.',
    }),
    documentation: i18n.translate(
      'xpack.urlDrilldown.context.panel.timeRange.indexPatternIds.documentation',
      {
        defaultMessage: 'List of all index pattern IDs used by the panel.',
      }
    ),
  },
  savedObjectId: {
    title: i18n.translate('xpack.urlDrilldown.context.panel.savedObjectId.title', {
      defaultMessage: 'Saved object ID.',
    }),
    documentation: i18n.translate('xpack.urlDrilldown.context.panel.savedObjectId.documentation', {
      defaultMessage: 'ID of the saved object behind the panel.',
    }),
  },
};

const kind = monaco.languages.CompletionItemKind.Variable;
const sortPrefix = '2.';

const formatValue = (value: unknown) => {
  if (typeof value === 'object') {
    return '\n' + JSON.stringify(value, null, 4);
  }

  return String(value);
};

const getPanelVariableList = (values: PanelValues): UrlTemplateEditorVariable[] => {
  const variables: UrlTemplateEditorVariable[] = [];
  const flattenedValues = getFlattenedObject(values);
  const keys = Object.keys(flattenedValues).sort();

  for (const key of keys) {
    const description = variableDescriptions[key];
    const label = 'context.panel.' + key;

    if (!description) {
      variables.push({
        label,
        sortText: sortPrefix + label,
        documentation: !!flattenedValues[key] ? txtValue(formatValue(flattenedValues[key])) : '',
        kind,
      });
      continue;
    }

    variables.push({
      label,
      sortText: sortPrefix + label,
      title: description.title,
      documentation:
        (description.documentation || '') +
        (!!description.documentation && !!flattenedValues[key] ? '\n\n' : '') +
        (!!flattenedValues[key] ? txtValue(formatValue(flattenedValues[key])) : ''),
      kind,
    });
  }

  return variables;
};

export const getContextVariableList = (
  context: ActionFactoryContext
): UrlTemplateEditorVariable[] => {
  const values = getContextScopeValues(context);
  const variables: UrlTemplateEditorVariable[] = getPanelVariableList(values.panel);

  return variables;
};
