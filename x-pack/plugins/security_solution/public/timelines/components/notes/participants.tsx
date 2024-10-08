/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { filter, uniqBy } from 'lodash/fp';
import {
  EuiAvatar,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiHorizontalRule,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import React, { Fragment, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import {
  NOTE_AVATAR_WITH_NAME_TEST_ID,
  NOTES_PARTICIPANTS_TITLE_TEST_ID,
  TIMELINE_AVATAR_WITH_NAME_TEST_ID,
  TIMELINE_PARTICIPANT_TITLE_TEST_ID,
} from './test_ids';
import { type Note } from '../../../../common/api/timeline';

export const PARTICIPANTS = i18n.translate(
  'xpack.securitySolution.timeline.notes.participantsTitle',
  {
    defaultMessage: 'Participants',
  }
);
export const CREATED_BY = i18n.translate('xpack.securitySolution.timeline notes.createdByLabel', {
  defaultMessage: 'Created by',
});

interface UsernameWithAvatar {
  /**
   * The username to display
   */
  username: string;
  /**
   * Data test subject string for testing
   */
  ['data-test-subj']?: string;
}

/**
 * Renders the username with an avatar
 */
const UsernameWithAvatar: React.FC<UsernameWithAvatar> = React.memo(
  ({ username, 'data-test-subj': dataTestSubj }) => {
    const { euiTheme } = useEuiTheme();

    return (
      <EuiFlexGroup
        gutterSize="s"
        responsive={false}
        alignItems="center"
        css={css`
          flex-grow: 0;
        `}
        data-test-subj={dataTestSubj}
      >
        <EuiFlexItem grow={false}>
          <EuiAvatar data-test-subj="avatar" name={username} size="l" />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText
            css={css`
              font-weight: ${euiTheme.font.weight.bold};
            `}
          >
            {username}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);

UsernameWithAvatar.displayName = 'UsernameWithAvatar';

interface ParticipantsProps {
  /**
   * The notes associated with the timeline
   */
  notes: Note[];
  /**
   * The user who created the timeline
   */
  timelineCreatedBy: string | undefined;
}

/**
 * Renders all the users that are participating to the timeline
 * - the user who created the timeline
 * - all the unique users who created notes associated with the timeline
 */
export const Participants: React.FC<ParticipantsProps> = React.memo(
  ({ notes, timelineCreatedBy }) => {
    // filter for savedObjectId to make sure we don't display `elastic` user while saving the note
    const participants = useMemo(() => uniqBy('updatedBy', filter('noteId', notes)), [notes]);

    return (
      <>
        {timelineCreatedBy && (
          <>
            <EuiTitle size="xs" data-test-subj={TIMELINE_PARTICIPANT_TITLE_TEST_ID}>
              <h4>{CREATED_BY}</h4>
            </EuiTitle>
            <EuiHorizontalRule margin="s" />
            <UsernameWithAvatar
              username={timelineCreatedBy}
              data-test-subj={TIMELINE_AVATAR_WITH_NAME_TEST_ID}
            />
            <EuiSpacer size="xxl" />
          </>
        )}
        <>
          <EuiTitle size="xs" data-test-subj={NOTES_PARTICIPANTS_TITLE_TEST_ID}>
            <h4>{PARTICIPANTS}</h4>
          </EuiTitle>
          <EuiHorizontalRule margin="s" />
          {participants.map((participant, index) => (
            <Fragment key={participant.updatedBy === null ? undefined : participant.updatedBy}>
              <UsernameWithAvatar
                key={participant.updatedBy === null ? undefined : participant.updatedBy}
                username={String(participant.updatedBy)}
                data-test-subj={`${NOTE_AVATAR_WITH_NAME_TEST_ID}-${index}`}
              />
              <EuiSpacer size="s" />
            </Fragment>
          ))}
        </>
      </>
    );
  }
);

Participants.displayName = 'Participants';
