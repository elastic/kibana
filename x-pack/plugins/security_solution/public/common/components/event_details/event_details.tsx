/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { noop } from 'lodash/fp';
import {
  EuiButtonIcon,
  EuiPopover,
  EuiTabbedContent,
  EuiTabbedContentTab,
  EuiToolTip,
} from '@elastic/eui';
import React, { useMemo } from 'react';
import styled from 'styled-components';

import { BrowserFields } from '../../containers/source';
import { DetailItem } from '../../../graphql/types';
import { ColumnHeaderOptions } from '../../../timelines/store/timeline/model';
import { OnUpdateColumns } from '../../../timelines/components/timeline/events';
import { EventFieldsBrowser } from './event_fields_browser';
import { JsonView } from './json_view';
import * as i18n from './translations';
import { COLLAPSE, COLLAPSE_EVENT } from '../../../timelines/components/timeline/body/translations';

export type View = 'table-view' | 'json-view';

const PopoverContainer = styled.div`
  left: -40px;
  position: relative;
  top: 10px;

  .euiPopover {
    position: fixed;
    z-index: 10;
  }
`;

const CollapseButton = styled(EuiButtonIcon)`
  border: 1px solid;
`;

CollapseButton.displayName = 'CollapseButton';

interface Props {
  browserFields: BrowserFields;
  columnHeaders: ColumnHeaderOptions[];
  data: DetailItem[];
  id: string;
  view: View;
  onEventToggled: () => void;
  onUpdateColumns: OnUpdateColumns;
  onViewSelected: (selected: View) => void;
  timelineId: string;
  toggleColumn: (column: ColumnHeaderOptions) => void;
}

const Details = styled.div`
  user-select: none;
`;

Details.displayName = 'Details';

export const EventDetails = React.memo<Props>(
  ({
    browserFields,
    columnHeaders,
    data,
    id,
    view,
    onEventToggled,
    onUpdateColumns,
    onViewSelected,
    timelineId,
    toggleColumn,
  }) => {
    const button = useMemo(
      () => (
        <EuiToolTip content={COLLAPSE_EVENT}>
          <CollapseButton
            aria-label={COLLAPSE}
            data-test-subj="collapse"
            iconType="cross"
            size="s"
            onClick={onEventToggled}
          />
        </EuiToolTip>
      ),
      [onEventToggled]
    );

    const tabs: EuiTabbedContentTab[] = [
      {
        id: 'table-view',
        name: i18n.TABLE,
        content: (
          <EventFieldsBrowser
            browserFields={browserFields}
            columnHeaders={columnHeaders}
            data={data}
            eventId={id}
            onUpdateColumns={onUpdateColumns}
            timelineId={timelineId}
            toggleColumn={toggleColumn}
          />
        ),
      },
      {
        id: 'json-view',
        name: i18n.JSON_VIEW,
        content: <JsonView data={data} />,
      },
    ];

    return (
      <Details data-test-subj="eventDetails">
        <PopoverContainer>
          <EuiPopover
            button={button}
            isOpen={false}
            closePopover={noop}
            repositionOnScroll={true}
          />
        </PopoverContainer>
        <EuiTabbedContent
          tabs={tabs}
          selectedTab={view === 'table-view' ? tabs[0] : tabs[1]}
          onTabClick={(e) => onViewSelected(e.id as View)}
        />
      </Details>
    );
  }
);

EventDetails.displayName = 'EventDetails';
