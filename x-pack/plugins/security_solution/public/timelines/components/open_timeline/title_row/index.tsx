/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButton, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React from 'react';

import * as i18n from '../translations';
import { OpenTimelineProps } from '../types';
import { HeaderSection } from '../../../../common/components/header_section';

type Props = Pick<OpenTimelineProps, 'onAddTimelinesToFavorites' | 'title'> & {
  /** The number of timelines currently selected */
  selectedTimelinesCount: number;
  children?: JSX.Element;
};

/**
 * Renders the row containing the tile (e.g. Open Timelines / All timelines)
 * and action buttons (i.e. Favorite Selected and Delete Selected)
 */
export const TitleRow = React.memo<Props>(
  ({ children, onAddTimelinesToFavorites, selectedTimelinesCount, title }) => (
    <HeaderSection title={title} split={true}>
      <EuiFlexGroup gutterSize="s" responsive={false}>
        {onAddTimelinesToFavorites && (
          <EuiFlexItem grow={false}>
            <EuiButton
              data-test-subj="favorite-selected"
              iconSide="left"
              iconType="starEmptySpace"
              isDisabled={selectedTimelinesCount === 0}
              onClick={onAddTimelinesToFavorites}
            >
              {i18n.FAVORITE_SELECTED}
            </EuiButton>
          </EuiFlexItem>
        )}

        {children && <EuiFlexItem>{children}</EuiFlexItem>}
      </EuiFlexGroup>
    </HeaderSection>
  )
);

TitleRow.displayName = 'TitleRow';
