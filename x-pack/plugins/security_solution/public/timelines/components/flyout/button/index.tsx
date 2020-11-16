/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiPanel } from '@elastic/eui';
import { rgba } from 'polished';
import React from 'react';
import styled from 'styled-components';

import { IS_DRAGGING_CLASS_NAME } from '../../../../common/components/drag_and_drop/helpers';
import { DataProvider } from '../../timeline/data_providers/data_provider';
import { flattenIntoAndGroups } from '../../timeline/data_providers/helpers';
import { DataProviders } from '../../timeline/data_providers';
import { FlyoutHeaderPanel } from '../header';

export const FLYOUT_BUTTON_CLASS_NAME = 'timeline-flyout-button';

export const getBadgeCount = (dataProviders: DataProvider[]): number =>
  flattenIntoAndGroups(dataProviders).reduce((total, group) => total + group.length, 0);

const SHOW_HIDE_TRANSLATE_X = 50; // px

const Container = styled.div`
  position: fixed;
  left: 0;
  bottom: 0;
  transform: translateY(calc(100% - ${SHOW_HIDE_TRANSLATE_X}px));
  user-select: none;
  width: 100%;
  z-index: ${({ theme }) => theme.eui.euiZLevel9};

  .${IS_DRAGGING_CLASS_NAME} & {
    transform: none;
  }

  .${FLYOUT_BUTTON_CLASS_NAME} {
    background: ${({ theme }) => rgba(theme.eui.euiPageBackgroundColor, 1)};
    border-radius: 4px 4px 0 0;
    box-shadow: none;
    height: 46px;
  }

  .${IS_DRAGGING_CLASS_NAME} & .${FLYOUT_BUTTON_CLASS_NAME} {
    color: ${({ theme }) => theme.eui.euiColorSuccess};
    background: ${({ theme }) => rgba(theme.eui.euiColorSuccess, 0.2)} !important;
    border: 1px solid ${({ theme }) => theme.eui.euiColorSuccess};
    border-bottom: none;
    text-decoration: none;
  }
`;

Container.displayName = 'Container';

const DataProvidersPanel = styled(EuiPanel)`
  border-radius: 0;
  padding: 0 4px 0 4px;
  user-select: none;
  z-index: ${({ theme }) => theme.eui.euiZLevel9};
`;

interface FlyoutButtonProps {
  show: boolean;
  timelineId: string;
}

export const FlyoutButton = React.memo<FlyoutButtonProps>(({ show, timelineId }) => {
  if (!show) {
    return null;
  }

  return (
    <Container>
      <FlyoutHeaderPanel timelineId={timelineId} />
      <DataProvidersPanel paddingSize="none">
        <DataProviders timelineId={timelineId} />
      </DataProvidersPanel>
    </Container>
  );
});

FlyoutButton.displayName = 'FlyoutButton';
