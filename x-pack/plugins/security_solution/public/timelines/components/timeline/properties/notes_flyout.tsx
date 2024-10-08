/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiFlyoutResizable,
  EuiOutsideClickDetector,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import styled from 'styled-components';
import type { EuiTheme } from '@kbn/react-kibana-context-styled';
import type { NoteCardsProps } from '../../notes/note_cards';
import { NoteCards } from '../../notes/note_cards';
import * as i18n from './translations';

export type NotesFlyoutProps = {
  show: boolean;
  onClose: () => void;
  eventId?: string;
} & Pick<
  NoteCardsProps,
  'notes' | 'associateNote' | 'toggleShowAddNote' | 'timelineId' | 'onCancel'
>;

/*
 * z-index override is needed because otherwise NotesFlyout appears below
 * Timeline Modal as they both have same z-index of 1000
 */
const NotesFlyoutContainer = styled(EuiFlyoutResizable)`
  /*
  * We want the width of flyout to be less than 50% of screen because
  * otherwise it interferes with the delete notes modal
  * */
  width: 30%;
  z-index: ${(props) =>
    ((props.theme as EuiTheme).eui.euiZFlyout.toFixed() ?? 1000) + 2} !important;
`;

export const NotesFlyout = React.memo(function NotesFlyout(props: NotesFlyoutProps) {
  const { eventId, toggleShowAddNote, show, onClose, associateNote, notes, timelineId, onCancel } =
    props;

  const notesFlyoutTitleId = useGeneratedHtmlId({
    prefix: 'notesFlyoutTitle',
  });

  if (!show || !eventId) {
    return null;
  }

  return (
    <EuiOutsideClickDetector onOutsideClick={onClose}>
      <NotesFlyoutContainer
        ownFocus={false}
        className="timeline-notes-flyout"
        data-test-subj="timeline-notes-flyout"
        onClose={onClose}
        aria-labelledby={notesFlyoutTitleId}
        minWidth={500}
        maxWidth={1400}
      >
        <EuiFlyoutHeader hasBorder>
          <EuiTitle size="m">
            <h2>{i18n.NOTES}</h2>
          </EuiTitle>
        </EuiFlyoutHeader>
        <EuiFlyoutBody>
          <NoteCards
            ariaRowindex={0}
            associateNote={associateNote}
            className="notes-in-flyout"
            data-test-subj="note-cards"
            notes={notes}
            showAddNote={true}
            toggleShowAddNote={toggleShowAddNote}
            eventId={eventId}
            timelineId={timelineId}
            onCancel={onCancel}
            showToggleEventDetailsAction={false}
          />
        </EuiFlyoutBody>
      </NotesFlyoutContainer>
    </EuiOutsideClickDetector>
  );
});
