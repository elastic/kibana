/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiToolTip, EuiButtonIcon } from '@elastic/eui';
import React from 'react';
import styled from 'styled-components';
import { ControlColumnProps, ActionProps } from '@kbn/timelines-plugin/common';
import { getActionsColumnWidth, DEFAULT_ACTION_BUTTON_WIDTH } from '@kbn/timelines-plugin/public';
import * as i18n from './translations';

const EventsTdContent = styled.div.attrs(({ className }) => ({
  className: `siemEventsTable__tdContent ${className != null ? className : ''}`,
}))<{ textAlign?: string; width?: number }>`
  font-size: ${({ theme }) => theme.eui.euiFontSizeXS};
  line-height: ${({ theme }) => theme.eui.euiLineHeight};
  min-width: 0;
  padding: ${({ theme }) => theme.eui.paddingSizes.xs};
  text-align: ${({ textAlign }) => textAlign};
  width: ${({ width }) =>
    width != null
      ? `${width}px`
      : '100%'}; /* Using width: 100% instead of flex: 1 and max-width: 100% for IE11 */

  button.euiButtonIcon {
    margin-left: ${({ theme }) => `-${theme.eui.paddingSizes.xs}`};
  }
`;

export const getPreviewTableControlColumn = (actionButtonCount: number): ControlColumnProps[] => [
  {
    headerCellRender: () => <>{i18n.ACTIONS}</>,
    id: 'default-timeline-control-column',
    rowCellRender: PreviewActions,
    width: getActionsColumnWidth(actionButtonCount),
  },
];

const ActionsContainer = styled.div`
  align-items: center;
  display: flex;
`;

const PreviewActionsComponent: React.FC<ActionProps> = ({
  ariaRowindex,
  columnValues,
  onEventDetailsPanelOpened,
}) => {
  return (
    <ActionsContainer>
      <div key="expand-event">
        <EventsTdContent textAlign="center" width={DEFAULT_ACTION_BUTTON_WIDTH + 10}>
          <EuiToolTip data-test-subj="expand-event-tool-tip" content={i18n.VIEW_DETAILS}>
            <EuiButtonIcon
              aria-label={i18n.VIEW_DETAILS_FOR_ROW({ ariaRowindex, columnValues })}
              data-test-subj="expand-event"
              iconType="expand"
              onClick={onEventDetailsPanelOpened}
              size="s"
            />
          </EuiToolTip>
        </EventsTdContent>
      </div>
    </ActionsContainer>
  );
};

PreviewActionsComponent.displayName = 'PreviewActionsComponent';

export const PreviewActions = React.memo(PreviewActionsComponent);
