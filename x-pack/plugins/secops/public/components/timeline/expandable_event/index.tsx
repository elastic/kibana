/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiPanel, EuiToolTip } from '@elastic/eui';
import * as React from 'react';
import { pure } from 'recompose';
import styled from 'styled-components';

import { DetailItem } from '../../../graphql/types';
import { WithCopyToClipboard } from '../../../lib/clipboard/with_copy_to_clipboard';
import { StatefulEventDetails } from '../../event_details/stateful_event_details';
import { LazyAccordion } from '../../lazy_accordion';
import { WithHoverActions } from '../../with_hover_actions';

import * as i18n from './translations';

const EventWithHoverActions = styled.div`
  display: flex;
  justify-content: space-between;
  width: 100%;
`;

const ExpandableDetails = styled.div<{ hideExpandButton: boolean; width: number }>`
  width: ${({ width }) => (width ? `${width}px;` : '100%')}
    ${({ hideExpandButton }) =>
      hideExpandButton
        ? `
  .euiAccordion__button svg {
    width: 0px;
    height: 0px;
  }
  `
        : ''};
`;

const HoverActionsRelativeContainer = styled.div`
  position: relative;
`;

const HoverActionsContainer = styled(EuiPanel)`
  align-items: center;
  display: flex;
  flex-direction: row;
  height: 25px;
  justify-content: center;
  left: -65px;
  position: absolute;
  top: -30px;
  width: 30px;
`;

interface Props {
  id: string;
  event: DetailItem[];
  forceExpand?: boolean;
  hideExpandButton?: boolean;
  stringifiedEvent: string;
  timelineId: string;
  width: number;
}

export const ExpandableEvent = pure<Props>(
  ({
    event,
    forceExpand = false,
    hideExpandButton = false,
    id,
    stringifiedEvent,
    timelineId,
    width,
  }) => (
    <ExpandableDetails
      data-test-subj="timeline-expandable-details"
      hideExpandButton={hideExpandButton}
      width={width}
    >
      <LazyAccordion
        id={`timeline-${timelineId}-row-${id}`}
        buttonContent={
          <WithHoverActions
            render={showHoverContent => (
              <EventWithHoverActions>
                <HoverActionsRelativeContainer>
                  {showHoverContent ? (
                    <HoverActionsContainer data-test-subj="hover-actions-container">
                      <EuiToolTip content={i18n.COPY_TO_CLIPBOARD}>
                        <WithCopyToClipboard text={stringifiedEvent} titleSummary={i18n.EVENT} />
                      </EuiToolTip>
                    </HoverActionsContainer>
                  ) : null}
                </HoverActionsRelativeContainer>
              </EventWithHoverActions>
            )}
          />
        }
        forceExpand={forceExpand}
        paddingSize="none"
      >
        <StatefulEventDetails data={event} id={id} />
      </LazyAccordion>
    </ExpandableDetails>
  )
);
