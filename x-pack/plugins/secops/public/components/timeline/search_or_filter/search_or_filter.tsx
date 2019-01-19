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

import { KqlMode } from '../../../store/local/timeline/model';
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
  kqlMode: KqlMode;
  kqlQuery: string;
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
  updateKqlQuery: (
    {
      id,
      kqlQuery,
    }: {
      id: string;
      kqlQuery: string;
    }
  ) => void;
}

const SearchAndFilterContainer = styled.div`
  margin: 5px 0 10px 0;
  user-select: none;
`;

const ModeFlexItem = styled(EuiFlexItem)`
  user-select: none;
`;

const SuperSelect = styled(EuiSuperSelect)``;

export const SearchOrFilter = pure<Props>(
  ({ kqlMode, kqlQuery, timelineId, updateKqlMode, updateKqlQuery }) => (
    <SearchAndFilterContainer>
      <EuiFlexGroup data-test-subj="timeline-search-and-filter-container">
        <ModeFlexItem grow={false}>
          <EuiToolTip content={i18n.FILTER_OR_SEARCH_WITH_KQL}>
            <SuperSelect
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
        <EuiFlexItem data-test-subj="timeline-search-container">
          <EuiToolTip content={modes[kqlMode].kqlBarTooltip}>
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
              query={kqlQuery}
              onChange={({ queryText }: { queryText: string }) =>
                // TODO: this handler is NOT being called by `EuiSearchBar`, which causes the query entered by the user to disappear
                updateKqlQuery({ id: timelineId, kqlQuery: queryText })
              }
            />
          </EuiToolTip>
        </EuiFlexItem>
      </EuiFlexGroup>
    </SearchAndFilterContainer>
  )
);
