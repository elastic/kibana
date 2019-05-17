/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiAvatar, EuiFlexGroup, EuiFlexItem, EuiText, EuiSpacer, EuiToolTip } from '@elastic/eui';
import { FormattedRelative } from '@kbn/i18n/react';
import * as React from 'react';
import { pure } from 'recompose';
import styled from 'styled-components';

import { FormattedDate } from '../../formatted_date';
import { getEmptyValue, defaultToEmptyTag } from '../../empty_value';
import { Markdown } from '../../markdown';

import * as i18n from '../translations';
import { TimelineResultNote } from '../types';

export const Avatar = styled(EuiAvatar)`
  margin-right: 12px;
  user-select: none;
`;

const UpdatedBy = styled.div`
  font-weight: bold;
`;

const NotePreviewFlexGroup = styled(EuiFlexGroup)`
  margin: 16px 0;
  width: 100%;
`;

/**
 * Renders a preview of a note in the All / Open Timelines table
 */
export const NotePreview = pure<Pick<TimelineResultNote, 'note' | 'updated' | 'updatedBy'>>(
  ({ note, updated, updatedBy }) => (
    <NotePreviewFlexGroup direction="row" gutterSize="none">
      <EuiFlexItem grow={false}>
        <Avatar data-test-subj="avatar" size="m" name={updatedBy != null ? updatedBy : '?'} />
      </EuiFlexItem>

      <EuiFlexItem grow={true}>
        <UpdatedBy data-test-subj="updated-by">{defaultToEmptyTag(updatedBy)}</UpdatedBy>

        <div data-test-subj="posted">
          <EuiText color="subdued" grow={true} size="xs">
            {i18n.POSTED}{' '}
            {updated != null ? (
              <EuiToolTip content={<FormattedDate fieldName="" value={updated} />}>
                <FormattedRelative data-test-subj="updated" value={new Date(updated)} />
              </EuiToolTip>
            ) : (
              getEmptyValue()
            )}
          </EuiText>
        </div>

        <EuiSpacer data-test-subj="posted-spacer" size="s" />

        <Markdown raw={note || ''} size="xs" />
      </EuiFlexItem>
    </NotePreviewFlexGroup>
  )
);
