/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { monaco } from '@kbn/monaco';
import type { Filter, Query, TimeRange } from '../../../../../../../src/plugins/data/public';
import {
  EmbeddableInput,
  EmbeddableOutput,
} from '../../../../../../../src/plugins/embeddable/public';
import type { EmbeddableWithQueryInput } from '../url_drilldown';
import { deleteUndefinedKeys } from './util';
import type { ActionFactoryContext } from '../url_drilldown';
import type { UrlTemplateEditorVariable } from '../../../../../../../src/plugins/kibana_react/public';

/**
 * Part of context scope extracted from an embeddable
 * Expose on the scope as: `{{context.panel.id}}`, `{{context.panel.filters.[0]}}`
 */
interface PanelValues extends EmbeddableInput {
  /**
   * ID of the embeddable panel.
   */
  id: string;

  /**
   * Title of the embeddable panel.
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

  query?: Query;
  filters?: Filter[];
  timeRange?: TimeRange;
  savedObjectId?: string;
}

interface ContextValues {
  panel: PanelValues;
}

function hasSavedObjectId(obj: Record<string, any>): obj is { savedObjectId: string } {
  return 'savedObjectId' in obj && typeof obj.savedObjectId === 'string';
}

/**
 * @todo Same functionality is implemented in x-pack/plugins/discover_enhanced/public/actions/explore_data/shared.ts,
 *       combine both implementations into a common approach.
 */
function getIndexPatternIds(output: EmbeddableOutput): string[] {
  function hasIndexPatterns(
    _output: Record<string, any>
  ): _output is { indexPatterns: Array<{ id?: string }> } {
    return (
      'indexPatterns' in _output &&
      Array.isArray(_output.indexPatterns) &&
      _output.indexPatterns.length > 0
    );
  }
  return hasIndexPatterns(output)
    ? (output.indexPatterns.map((ip) => ip.id).filter(Boolean) as string[])
    : [];
}

export function getEmbeddableVariables(embeddable: EmbeddableWithQueryInput): PanelValues {
  const input = embeddable.getInput();
  const output = embeddable.getOutput();
  const indexPatternsIds = getIndexPatternIds(output);

  return deleteUndefinedKeys({
    id: input.id,
    title: output.title ?? input.title,
    savedObjectId:
      output.savedObjectId ?? (hasSavedObjectId(input) ? input.savedObjectId : undefined),
    query: input.query,
    timeRange: input.timeRange,
    filters: input.filters,
    indexPatternIds: indexPatternsIds.length > 1 ? indexPatternsIds : undefined,
    indexPatternId: indexPatternsIds.length === 1 ? indexPatternsIds[0] : undefined,
  });
}

const getContextPanelScopeValues = (contextScopeInput: unknown): PanelValues => {
  function hasEmbeddable(val: unknown): val is { embeddable: EmbeddableWithQueryInput } {
    if (val && typeof val === 'object' && 'embeddable' in val) return true;
    return false;
  }
  if (!hasEmbeddable(contextScopeInput))
    throw new Error(
      "UrlDrilldown [getContextScope] can't build scope because embeddable object is missing in context"
    );
  const embeddable = contextScopeInput.embeddable;

  return getEmbeddableVariables(embeddable);
};

export const getContextScopeValues = (contextScopeInput: unknown): ContextValues => {
  return {
    panel: getContextPanelScopeValues(contextScopeInput),
  };
};

type VariableDescription = Pick<UrlTemplateEditorVariable, 'title' | 'documentation'>;

const variableDescriptions: Record<string, undefined | VariableDescription> = {
  id: {
    title: i18n.translate('xpack.urlDrilldown.context.panel.title', {
      defaultMessage: 'List of row cell values.',
    }),
    documentation: i18n.translate('xpack.urlDrilldown.row.event.values.documentation', {
      defaultMessage: 'An array of all cell values for the raw on which the action will execute.',
    }),
  },
};

const kind = monaco.languages.CompletionItemKind.Variable;

const getPanelVariableList = (values: PanelValues): UrlTemplateEditorVariable[] => {
  const variables: UrlTemplateEditorVariable[] = [];
  const keys = Object.keys(values).sort();

  for (const key of keys) {
    const description = variableDescriptions[key];

    if (!description) {
      variables.push({
        label: 'context.panel.' + key,
        kind,
      });
      continue;
    }

    variables.push({
      label: 'context.panel.' + key,
      title: description.title,
      documentation: description.documentation,
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
