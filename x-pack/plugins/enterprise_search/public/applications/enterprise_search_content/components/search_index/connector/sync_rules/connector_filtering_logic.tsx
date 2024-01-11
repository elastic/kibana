/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { isEqual } from 'lodash';

import {
  FilteringConfig,
  FilteringRule,
  FilteringValidation,
  FilteringValidationState,
} from '@kbn/search-connectors';

import { Status } from '../../../../../../../common/types/api';

import { Actions } from '../../../../../shared/api_logic/create_api_logic';
import { clearFlashMessages } from '../../../../../shared/flash_messages';
import {
  ConnectorFilteringApiLogic,
  PutConnectorFilteringArgs,
  PutConnectorFilteringResponse,
} from '../../../../api/connector/update_connector_filtering_api_logic';
import {
  ConnectorFilteringDraftApiLogic,
  PutConnectorFilteringDraftArgs,
  PutConnectorFilteringDraftResponse,
} from '../../../../api/connector/update_connector_filtering_draft_api_logic';
import {
  FetchIndexApiLogic,
  FetchIndexApiParams,
  FetchIndexApiResponse,
} from '../../../../api/index/fetch_index_api_logic';
import { isConnectorIndex } from '../../../../utils/indices';

type ConnectorFilteringActions = Pick<
  Actions<PutConnectorFilteringArgs, PutConnectorFilteringResponse>,
  'apiSuccess' | 'makeRequest'
> & {
  addFilteringRule(filteringRule: FilteringRule): FilteringRule;
  applyDraft: () => void;
  deleteFilteringRule(filteringRule: FilteringRule): FilteringRule;
  draftApiError: Actions<
    PutConnectorFilteringDraftArgs,
    PutConnectorFilteringDraftResponse
  >['apiError'];
  draftApiSuccess: Actions<
    PutConnectorFilteringDraftArgs,
    PutConnectorFilteringDraftResponse
  >['apiSuccess'];
  draftMakeRequest: Actions<
    PutConnectorFilteringDraftArgs,
    PutConnectorFilteringDraftResponse
  >['makeRequest'];
  fetchIndexApiSuccess: Actions<FetchIndexApiParams, FetchIndexApiResponse>['apiSuccess'];
  reorderFilteringRules(filteringRules: FilteringRule[]): FilteringRule[];
  revertLocalAdvancedFiltering: () => void;
  revertLocalFilteringRules: () => void;
  saveDraftFilteringRules: () => void;
  setFilteringConfig(filtering: FilteringConfig | null): FilteringConfig | null;
  setHasJsonValidationError(hasJsonValidationError: boolean): { hasJsonValidationError: boolean };
  setIsEditing(isEditing: boolean): { isEditing: boolean };
  setLocalAdvancedSnippet(advancedSnippet: string): { advancedSnippet: string };
  setLocalFilteringRules(filteringRules: FilteringRule[]): FilteringRule[];
  updateFilteringRule(filteringRule: FilteringRule): FilteringRule;
};

interface ConnectorFilteringValues {
  advancedSnippet: string;
  draftErrors: FilteringValidation[];
  draftState: FilteringValidationState;
  editableFilteringRules: FilteringRule[];
  filteringConfig: FilteringConfig | null;
  filteringRules: FilteringRule[];
  hasDraft: boolean;
  hasJsonValidationError: boolean;
  index: FetchIndexApiResponse;
  isEditing: boolean;
  isLoading: boolean;
  jsonValidationError: boolean;
  lastFilteringRule: FilteringRule;
  localAdvancedSnippet: string;
  localFilteringRules: FilteringRule[];
  status: Status;
}

function createDefaultRule(order: number): FilteringRule {
  const now = new Date().toISOString();
  return {
    created_at: now,
    field: '_',
    id: 'DEFAULT',
    order,
    policy: 'include',
    rule: 'regex',
    updated_at: now,
    value: '.*',
  };
}

export const ConnectorFilteringLogic = kea<
  MakeLogicType<ConnectorFilteringValues, ConnectorFilteringActions>
>({
  actions: {
    addFilteringRule: (filteringRule) => filteringRule,
    applyDraft: true,
    deleteFilteringRule: (filteringRule) => filteringRule,
    reorderFilteringRules: (filteringRules) => filteringRules,
    revertLocalAdvancedFiltering: true,
    revertLocalFilteringRules: true,
    saveDraftFilteringRules: true,
    setFilteringConfig: (filteringConfig) => filteringConfig,
    setIsEditing: (isEditing: boolean) => ({
      isEditing,
    }),

    setLocalAdvancedSnippet: (advancedSnippet) => ({
      advancedSnippet,
    }),
    setLocalFilteringRules: (filteringRules) => filteringRules,
    updateFilteringRule: (filteringRule) => filteringRule,
  },
  connect: {
    actions: [
      ConnectorFilteringApiLogic,
      ['apiSuccess', 'makeRequest'],
      ConnectorFilteringDraftApiLogic,
      [
        'apiError as draftApiError',
        'apiSuccess as draftApiSuccess',
        'makeRequest as draftMakeRequest',
      ],
      FetchIndexApiLogic,
      ['apiSuccess as fetchIndexApiSuccess'],
    ],
    values: [ConnectorFilteringApiLogic, ['status'], FetchIndexApiLogic, ['data as index']],
  },
  events: ({ actions, values }) => ({
    afterMount: () =>
      actions.setFilteringConfig(
        isConnectorIndex(values.index) ? values.index.connector.filtering[0] : null
      ),
  }),
  listeners: ({ actions, values }) => ({
    applyDraft: () => {
      if (isConnectorIndex(values.index)) {
        actions.makeRequest({
          advancedSnippet: values.localAdvancedSnippet ?? '',
          connectorId: values.index.connector.id,
          filteringRules: values.localFilteringRules ?? [],
        });
      }
    },
    fetchIndexApiSuccess: (index) => {
      if (
        !values.isEditing &&
        isConnectorIndex(index) &&
        !isEqual(values.filteringConfig, index.connector.filtering[0])
      ) {
        actions.setFilteringConfig(index.connector.filtering[0]);
      }
    },
    makeRequest: () => clearFlashMessages(),
    saveDraftFilteringRules: () => {
      if (isConnectorIndex(values.index)) {
        actions.draftMakeRequest({
          advancedSnippet: values.localAdvancedSnippet ?? '',
          connectorId: values.index.connector.id,
          filteringRules: values.localFilteringRules ?? [],
        });
      }
    },
    setIsEditing: (isEditing) => {
      if (isEditing && values.filteringConfig) {
        actions.setLocalFilteringRules(
          values.hasDraft ? values.filteringConfig.draft.rules : values.filteringConfig.active.rules
        );
        actions.setLocalAdvancedSnippet(
          values.hasDraft
            ? JSON.stringify(
                values.filteringConfig.draft.advanced_snippet.value ?? {},
                undefined,
                2
              )
            : JSON.stringify(
                values.filteringConfig.active.advanced_snippet.value ?? {},
                undefined,
                2
              )
        );
      }
    },
  }),
  path: ['enterprise_search', 'content', 'connector_filtering'],
  reducers: () => ({
    filteringConfig: [
      null,
      {
        apiSuccess: (filteringConfig, filteringRules) =>
          filteringConfig
            ? {
                ...filteringConfig,
                active: filteringRules,
              }
            : null,
        draftApiSuccess: (filteringConfig, filteringRules) =>
          filteringConfig
            ? {
                ...filteringConfig,
                draft: filteringRules,
              }
            : null,
        setFilteringConfig: (_, filteringConfig) => filteringConfig,
      },
    ],
    isEditing: [
      false,
      {
        draftApiError: () => false,
        draftApiSuccess: () => false,
        setIsEditing: (_, { isEditing }) => isEditing,
      },
    ],
    localAdvancedSnippet: [
      '',
      {
        setLocalAdvancedSnippet: (_, { advancedSnippet }) => advancedSnippet,
      },
    ],
    localFilteringRules: [
      [],
      {
        addFilteringRule: (filteringRules, filteringRule) => {
          const newFilteringRules: FilteringRule[] = filteringRules.length
            ? [
                ...filteringRules.slice(0, filteringRules.length - 1),
                filteringRule,
                filteringRules[filteringRules.length - 1],
              ]
            : [filteringRule, createDefaultRule(1)];
          return newFilteringRules.map((rule, index) => ({ ...rule, order: index }));
        },
        deleteFilteringRule: (filteringRules, filteringRule) =>
          filteringRules.filter((rule) => rule.id !== filteringRule.id),
        reorderFilteringRules: (filteringRules, newFilteringRules) => {
          const lastItem = filteringRules.length
            ? filteringRules[filteringRules.length - 1]
            : createDefaultRule(0);
          return [...newFilteringRules, lastItem].map((rule, index) => ({ ...rule, order: index }));
        },
        setLocalFilteringRules: (_, filteringRules) => filteringRules,
        updateFilteringRule: (filteringRules, filteringRule) =>
          filteringRules.map((rule) => (rule.id === filteringRule.id ? filteringRule : rule)),
      },
    ],
  }),
  selectors: ({ selectors }) => ({
    advancedSnippet: [
      () => [selectors.filteringConfig],
      (filteringConfig: FilteringConfig | null) =>
        filteringConfig?.active.advanced_snippet.value
          ? JSON.stringify(filteringConfig?.active.advanced_snippet.value, undefined, 2)
          : '',
    ],
    draftErrors: [
      () => [selectors.filteringConfig],
      (filteringConfig: FilteringConfig | null) => filteringConfig?.draft.validation.errors ?? [],
    ],
    draftState: [
      () => [selectors.filteringConfig],
      (filteringConfig: FilteringConfig | null) =>
        filteringConfig?.draft.validation.state ?? FilteringValidationState.VALID,
    ],
    editableFilteringRules: [
      () => [selectors.localFilteringRules],
      (filteringRules: FilteringRule[] | null) => {
        return filteringRules?.length ? filteringRules.slice(0, filteringRules.length - 1) : [];
      },
    ],
    filteringRules: [
      () => [selectors.filteringConfig],
      (filteringConfig: FilteringConfig | null) => filteringConfig?.active.rules ?? [],
    ],
    hasDraft: [
      () => [selectors.filteringConfig],
      (filteringConfig: FilteringConfig | null) =>
        !isEqual(
          filteringConfig?.active.advanced_snippet.value,
          filteringConfig?.draft.advanced_snippet.value
        ) || !isEqual(filteringConfig?.draft.rules, filteringConfig?.active.rules),
    ],
    hasJsonValidationError: [
      () => [selectors.localAdvancedSnippet],
      (advancedSnippet: string) => {
        if (!advancedSnippet) return false;
        try {
          JSON.parse(advancedSnippet);
          return false;
        } catch {
          return true;
        }
      },
    ],
    isLoading: [() => [selectors.status], (status: Status) => status === Status.LOADING],
  }),
});
