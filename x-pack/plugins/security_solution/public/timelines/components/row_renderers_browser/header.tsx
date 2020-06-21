/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiTitle } from '@elastic/eui';
import React, { useCallback, useMemo } from 'react';
import styled from 'styled-components';

import { BrowserFields } from '../../../common/containers/source';
import { alertsHeaders } from '../../../alerts/components/alerts_table/default_config';
import { alertsHeaders as externalAlertsHeaders } from '../../../common/components/alerts_viewer/default_headers';
import { defaultHeaders as eventsDefaultHeaders } from '../../../common/components/events_viewer/default_headers';
import { defaultHeaders } from '../timeline/body/column_headers/default_headers';
import { OnUpdateColumns } from '../timeline/events';

import { SEARCH_INPUT_WIDTH } from './helpers';

import * as i18n from './translations';
import { useManageTimeline } from '../manage_timeline';

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

const TitleRow = React.memo<{
  id: string;
  isEventViewer?: boolean;
  onOutsideClick: () => void;
  onUpdateColumns: OnUpdateColumns;
}>(({ id, isEventViewer, onOutsideClick, onUpdateColumns }) => {
  const { getManageTimelineById } = useManageTimeline();
  const documentType = useMemo(() => getManageTimelineById(id).documentType, [
    getManageTimelineById,
    id,
  ]);
  const handleResetColumns = useCallback(() => {
    let resetDefaultHeaders = defaultHeaders;
    if (isEventViewer) {
      if (documentType.toLocaleLowerCase() === 'externalAlerts') {
        resetDefaultHeaders = externalAlertsHeaders;
      } else if (documentType.toLocaleLowerCase() === 'alerts') {
        resetDefaultHeaders = alertsHeaders;
      } else {
        resetDefaultHeaders = eventsDefaultHeaders;
      }
    }
    onUpdateColumns(resetDefaultHeaders);
    onOutsideClick();
  }, [isEventViewer, onOutsideClick, onUpdateColumns, documentType]);

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
        id={timelineId}
        isEventViewer={isEventViewer}
        onUpdateColumns={onUpdateColumns}
        onOutsideClick={onOutsideClick}
      />
    </HeaderContainer>
  )
);

Header.displayName = 'Header';
