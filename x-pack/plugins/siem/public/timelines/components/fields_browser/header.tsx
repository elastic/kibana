/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiButtonEmpty,
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import React, { useCallback } from 'react';
import styled from 'styled-components';

import { BrowserFields } from '../../../common/containers/source';
import { signalsHeaders } from '../../../alerts/components/signals/default_config';
import { alertsHeaders } from '../../../common/components/alerts_viewer/default_headers';
import { defaultHeaders as eventsDefaultHeaders } from '../../../common/components/events_viewer/default_headers';
import { defaultHeaders } from '../timeline/body/column_headers/default_headers';
import { OnUpdateColumns } from '../timeline/events';
import { useTimelineTypeContext } from '../timeline/timeline_context';

import { getFieldBrowserSearchInputClassName, getFieldCount, SEARCH_INPUT_WIDTH } from './helpers';

import * as i18n from './translations';

const CountsFlexGroup = styled(EuiFlexGroup)`
  margin-top: 5px;
`;

CountsFlexGroup.displayName = 'CountsFlexGroup';

const CountFlexItem = styled(EuiFlexItem)`
  margin-right: 5px;
`;

CountFlexItem.displayName = 'CountFlexItem';

// background-color: ${props => props.theme.eui.euiColorLightestShade};
const HeaderContainer = styled.div`
  padding: 16px;
  margin-bottom: 8px;
`;

HeaderContainer.displayName = 'HeaderContainer';

const SearchContainer = styled.div`
  input {
    max-width: ${SEARCH_INPUT_WIDTH}px;
    width: ${SEARCH_INPUT_WIDTH}px;
  }
`;

SearchContainer.displayName = 'SearchContainer';

interface Props {
  filteredBrowserFields: BrowserFields;
  isEventViewer?: boolean;
  isSearching: boolean;
  onOutsideClick: () => void;
  onSearchInputChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onUpdateColumns: OnUpdateColumns;
  searchInput: string;
  timelineId: string;
}

const CountRow = React.memo<Pick<Props, 'filteredBrowserFields'>>(({ filteredBrowserFields }) => (
  <CountsFlexGroup
    alignItems="center"
    data-test-subj="counts-flex-group"
    direction="row"
    gutterSize="none"
  >
    <CountFlexItem grow={false}>
      <EuiText color="subdued" data-test-subj="categories-count" size="xs">
        {i18n.CATEGORIES_COUNT(Object.keys(filteredBrowserFields).length)}
      </EuiText>
    </CountFlexItem>

    <CountFlexItem grow={false}>
      <EuiText color="subdued" data-test-subj="fields-count" size="xs">
        {i18n.FIELDS_COUNT(
          Object.keys(filteredBrowserFields).reduce<number>(
            (fieldsCount, category) => getFieldCount(filteredBrowserFields[category]) + fieldsCount,
            0
          )
        )}
      </EuiText>
    </CountFlexItem>
  </CountsFlexGroup>
));

CountRow.displayName = 'CountRow';

const TitleRow = React.memo<{
  isEventViewer?: boolean;
  onOutsideClick: () => void;
  onUpdateColumns: OnUpdateColumns;
}>(({ isEventViewer, onOutsideClick, onUpdateColumns }) => {
  const timelineTypeContext = useTimelineTypeContext();
  const handleResetColumns = useCallback(() => {
    let resetDefaultHeaders = defaultHeaders;
    if (isEventViewer) {
      if (timelineTypeContext.documentType?.toLocaleLowerCase() === 'alerts') {
        resetDefaultHeaders = alertsHeaders;
      } else if (timelineTypeContext.documentType?.toLocaleLowerCase() === 'signals') {
        resetDefaultHeaders = signalsHeaders;
      } else {
        resetDefaultHeaders = eventsDefaultHeaders;
      }
    }
    onUpdateColumns(resetDefaultHeaders);
    onOutsideClick();
  }, [isEventViewer, onOutsideClick, onUpdateColumns, timelineTypeContext]);

  return (
    <EuiFlexGroup
      alignItems="center"
      justifyContent="spaceBetween"
      direction="row"
      gutterSize="none"
    >
      <EuiFlexItem grow={false}>
        <EuiTitle data-test-subj="field-browser-title" size="s">
          <h2>{i18n.CUSTOMIZE_COLUMNS}</h2>
        </EuiTitle>
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <EuiButtonEmpty data-test-subj="reset-fields" onClick={handleResetColumns}>
          {i18n.RESET_FIELDS}
        </EuiButtonEmpty>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});

TitleRow.displayName = 'TitleRow';

export const Header = React.memo<Props>(
  ({
    isEventViewer,
    isSearching,
    filteredBrowserFields,
    onOutsideClick,
    onSearchInputChange,
    onUpdateColumns,
    searchInput,
    timelineId,
  }) => (
    <HeaderContainer>
      <TitleRow
        isEventViewer={isEventViewer}
        onUpdateColumns={onUpdateColumns}
        onOutsideClick={onOutsideClick}
      />
      <SearchContainer>
        <EuiFieldSearch
          className={getFieldBrowserSearchInputClassName(timelineId)}
          data-test-subj="field-search"
          isLoading={isSearching}
          onChange={onSearchInputChange}
          placeholder={i18n.FILTER_PLACEHOLDER}
          value={searchInput}
        />
      </SearchContainer>
      <CountRow filteredBrowserFields={filteredBrowserFields} />
    </HeaderContainer>
  )
);

Header.displayName = 'Header';
