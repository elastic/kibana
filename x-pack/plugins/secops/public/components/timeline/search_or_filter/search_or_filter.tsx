/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  // @ts-ignore
  EuiSearchBar,
  // @ts-ignore
  EuiSuperSelect,
  EuiToolTip,
} from '@elastic/eui';
import * as React from 'react';
import { pure } from 'recompose';
import styled, { injectGlobal } from 'styled-components';
import { StaticIndexPattern } from 'ui/index_patterns';

import { KueryAutocompletion } from '../../../containers/kuery_autocompletion';
import { KueryFilterQuery } from '../../../store';
import { KqlMode } from '../../../store/local/timeline/model';
import { AutocompleteField } from '../../autocomplete_field';
import { modes, options } from './helpers';
import * as i18n from './translations';

const timelineSelectModeItemsClassName = 'timelineSelectModeItemsClassName';

// SIDE EFFECT: the following creates a global class selector
// tslint:disable-next-line:no-unused-expression
injectGlobal`
  .${timelineSelectModeItemsClassName} {
    width: 350px !important;
  }
`;

interface Props {
  applyKqlFilterQuery: (expression: string) => void;
  filterQueryDraft: KueryFilterQuery;
  indexPattern: StaticIndexPattern;
  isFilterQueryDraftValid: boolean;
  kqlMode: KqlMode;
  timelineId: string;
  updateKqlMode: (
    {
      id,
      kqlMode,
    }: {
      id: string;
      kqlMode: KqlMode;
    }
  ) => void;
  setKqlFilterQueryDraft: (expression: string) => void;
}

const SearchOrFilterContainer = styled.div`
  margin: 5px 0 10px 0;
  user-select: none;
`;

const ModeFlexItem = styled(EuiFlexItem)`
  user-select: none;
`;

export const SearchOrFilter = pure<Props>(
  ({
    applyKqlFilterQuery,
    indexPattern,
    isFilterQueryDraftValid,
    filterQueryDraft,
    kqlMode,
    timelineId,
    setKqlFilterQueryDraft,
    updateKqlMode,
  }) => (
    <SearchOrFilterContainer>
      <EuiFlexGroup data-test-subj="timeline-search-or-filter" gutterSize="xs">
        <ModeFlexItem grow={false}>
          <EuiToolTip content={i18n.FILTER_OR_SEARCH_WITH_KQL}>
            <EuiSuperSelect
              data-test-subj="timeline-select-search-or-filter"
              hasDividers={true}
              itemLayoutAlign="top"
              itemClassName={timelineSelectModeItemsClassName}
              onChange={(mode: KqlMode) => updateKqlMode({ id: timelineId, kqlMode: mode })}
              options={options}
              valueOfSelected={kqlMode}
            />
          </EuiToolTip>
        </ModeFlexItem>
        <EuiFlexItem data-test-subj="timeline-search-or-filter-search-container">
          <EuiToolTip content={modes[kqlMode].kqlBarTooltip}>
            <>
              {kqlMode === 'filter' && (
                <EuiSearchBar
                  data-test-subj="timeline-search-bar"
                  box={{
                    placeholder: modes[kqlMode].placeholder,
                    incremental: false,
                    schema: {
                      flags: [],
                      fields: {},
                    },
                  }}
                  query=""
                  // TODO: this handler is NOT being called by `EuiSearchBar`, which causes the query entered by the user to disappear
                  // we might have to use onSearch
                  onChange={({ queryText }: { queryText: string }) =>
                    // tslint:disable-next-line:no-console
                    console.log('I will be doing filter at one point')
                  }
                />
              )}
              {kqlMode === 'search' && (
                <KueryAutocompletion indexPattern={indexPattern}>
                  {({ isLoadingSuggestions, loadSuggestions, suggestions }) => (
                    <AutocompleteField
                      isLoadingSuggestions={isLoadingSuggestions}
                      isValid={isFilterQueryDraftValid}
                      loadSuggestions={loadSuggestions}
                      onChange={setKqlFilterQueryDraft}
                      onSubmit={applyKqlFilterQuery}
                      placeholder={i18n.SEARCH_KQL_PLACEHOLDER}
                      suggestions={suggestions}
                      value={filterQueryDraft ? filterQueryDraft.expression : ''}
                    />
                  )}
                </KueryAutocompletion>
              )}
            </>
          </EuiToolTip>
        </EuiFlexItem>
      </EuiFlexGroup>
    </SearchOrFilterContainer>
  )
);
