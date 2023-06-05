/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { DataView } from '@kbn/data-views-plugin/common';
import { fromKueryExpression, KueryNode, Query } from '@kbn/es-query';
import { SuggestionsAbstraction } from '@kbn/unified-search-plugin/public/typeahead/suggestions_component';

import useAsync from 'react-use/lib/useAsync';
import { isEmpty } from 'lodash';
import { TriggersAndActionsUiServices } from '../../../../..';
import { useKibana } from '../../../../../common/lib/kibana';
import { NO_INDEX_PATTERNS } from '../../../alerts_search_bar/constants';
import { validateFieldsKueryNode } from './validate_kuery_node';

const suggestionsAbstraction: SuggestionsAbstraction = {
  type: 'rules',
  fields: {
    'alert.tags': {
      field: 'alert.tags',
      fieldToQuery: 'alert.attributes.tags',
      displayField: 'tags',
    },
    'alert.name.keyword': {
      field: 'alert.name.keyword',
      fieldToQuery: 'alert.attributes.name.keyword',
      displayField: 'name',
    },
    'alert.actions.actionTypeId': {
      field: 'alert.actions.actionTypeId',
      nestedField: 'alert.actions:{ actionTypeId  }',
      fieldToQuery: 'alert.attributes.actions.actionTypeId',
      displayField: 'actions',
    },
    'alert.alertTypeId': {
      field: 'alert.alertTypeId',
      fieldToQuery: 'alert.attributes.alertTypeId',
      displayField: 'type',
    },
    'alert.lastRun.outcome': {
      field: 'alert.lastRun.outcome',
      fieldToQuery: 'alert.attributes.lastRun.outcome',
      displayField: 'lastResponse',
    },
    'alert.enabled': {
      field: 'alert.enabled',
      fieldToQuery: 'alert.attributes.enabled',
      displayField: 'enabled',
    },
    'alert.muteAll': {
      field: 'alert.muteAll',
      fieldToQuery: 'alert.attributes.muteAll',
      displayField: 'muted',
    },
    'alert.params.threat.tactic.name': {
      field: 'alert.params.threat.tactic.name',
      fieldToQuery: 'alert.attributes.params.threat.tactic.name',
      displayField: 'threat.tactic.name',
    },
    'alert.params.threat.technique.name': {
      field: 'alert.params.threat.technique.name',
      fieldToQuery: 'alert.attributes.params.threat.technique.name',
      displayField: 'threat.technique.name',
    },
  },
};

const enhanceSuggestionAbstractionFields = (
  enhanceSuggestionsAbstraction: SuggestionsAbstraction
): SuggestionsAbstraction => {
  return {
    type: enhanceSuggestionsAbstraction.type,
    fields: Object.entries(enhanceSuggestionsAbstraction.fields).reduce<
      SuggestionsAbstraction['fields']
    >((acc, [key, value]) => {
      Object.assign(acc, { [value.displayField]: value });
      return acc;
    }, enhanceSuggestionsAbstraction.fields),
  };
};
export interface KqlSearchBarProps {
  onQuerySubmit: (kueryNode: KueryNode) => void;
}

export const KqlSearchBar = React.memo<KqlSearchBarProps>(({ onQuerySubmit }) => {
  const {
    http,
    notifications: { toasts },
    unifiedSearch: {
      ui: { SearchBar },
    },
  } = useKibana<TriggersAndActionsUiServices>().services;

  const {
    value: fields,
    loading,
    error,
  } = useAsync(async () => {
    return http.post<Array<{ name: string; esTypes: string[] }>>(
      `/internal/rules/suggestions/fields`,
      {
        body: JSON.stringify({
          fields: Object.keys(suggestionsAbstraction.fields).filter((key) =>
            key.includes('alert.')
          ),
        }),
      }
    );
  }, []);

  const dataView = [
    {
      title: '',
      fieldFormatMap: {},
      fields: fields?.map((field) => {
        return {
          ...field,
          ...(suggestionsAbstraction.fields[field.name]
            ? { customLabel: suggestionsAbstraction.fields[field.name].displayField }
            : {}),
          ...(field.esTypes.includes('flattened') ? { type: 'string' } : {}),
        };
      }),
    },
  ] as unknown as DataView[];

  const saMemo = useMemo(() => enhanceSuggestionAbstractionFields(suggestionsAbstraction), []);

  const handleQuerySubmit = ({ query }: { query?: Query }) => {
    let kueryNode = {} as KueryNode;
    if (!isEmpty(query?.query)) {
      kueryNode = fromKueryExpression(query?.query ?? '');
      try {
        validateFieldsKueryNode({ astFilter: kueryNode, suggestionAbstraction: saMemo });
      } catch (e) {
        toasts.addDanger(e.toString());
        return;
      }
    }
    onQuerySubmit(kueryNode);
  };

  return (
    <SearchBar
      appName="StackRules"
      disableQueryLanguageSwitcher={true}
      query={{ query: '', language: 'kuery' }}
      indexPatterns={loading || error ? NO_INDEX_PATTERNS : dataView}
      showAutoRefreshOnly={false}
      showDatePicker={false}
      showSaveQuery={false}
      showQueryInput={true}
      showQueryMenu={false}
      showFilterBar={true}
      showSubmitButton={false}
      suggestionsAbstraction={saMemo}
      onQuerySubmit={handleQuerySubmit}
    />
  );
});
