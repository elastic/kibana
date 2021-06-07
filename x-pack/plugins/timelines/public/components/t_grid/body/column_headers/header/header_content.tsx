/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiToolTip } from '@elastic/eui';
import { noop } from 'lodash/fp';
import React from 'react';

import type { ColumnHeaderOptions } from '../../../../../../common/types/timeline';
import { TruncatableText } from '../../../../truncatable_text';

import { EventsHeading, EventsHeadingTitleButton, EventsHeadingTitleSpan } from '../../../styles';
import { Sort } from '../../sort';
import { SortIndicator } from '../../sort/sort_indicator';
import { HeaderToolTipContent } from '../header_tooltip_content';
import { getSortDirection, getSortIndex } from './helpers';
interface HeaderContentProps {
  children: React.ReactNode;
  header: ColumnHeaderOptions;
  isLoading: boolean;
  isResizing: boolean;
  onClick: () => void;
  showSortingCapability: boolean;
  sort: Sort[];
}

const HeaderContentComponent: React.FC<HeaderContentProps> = ({
  children,
  header,
  isLoading,
  isResizing,
  onClick,
  showSortingCapability,
  sort,
}) => (
  <EventsHeading data-test-subj={`header-${header.id}`} isLoading={isLoading}>
    {header.aggregatable && showSortingCapability ? (
      <EventsHeadingTitleButton
        data-test-subj="header-sort-button"
        onClick={!isResizing && !isLoading ? onClick : noop}
      >
        <TruncatableText data-test-subj={`header-text-${header.id}`}>
          <EuiToolTip
            data-test-subj="header-tooltip"
            content={<HeaderToolTipContent header={header} />}
          >
            <>
              {React.isValidElement(header.display)
                ? header.display
                : header.displayAsText ?? header.id}
            </>
          </EuiToolTip>
        </TruncatableText>

        <SortIndicator
          data-test-subj="header-sort-indicator"
          sortDirection={getSortDirection({ header, sort })}
          sortNumber={getSortIndex({ header, sort })}
        />
      </EventsHeadingTitleButton>
    ) : (
      <EventsHeadingTitleSpan>
        <TruncatableText data-test-subj={`header-text-${header.id}`}>
          <EuiToolTip
            data-test-subj="header-tooltip"
            content={<HeaderToolTipContent header={header} />}
          >
            <>
              {React.isValidElement(header.display)
                ? header.display
                : header.displayAsText ?? header.id}
            </>
          </EuiToolTip>
        </TruncatableText>
      </EventsHeadingTitleSpan>
    )}

    {children}
  </EventsHeading>
);

export const HeaderContent = React.memo(HeaderContentComponent);
