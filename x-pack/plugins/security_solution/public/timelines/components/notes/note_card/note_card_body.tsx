/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiPanel, EuiToolTip } from '@elastic/eui';
import React, { useCallback, useMemo } from 'react';
import styled from 'styled-components';

import { WithCopyToClipboard } from '../../../../common/lib/clipboard/with_copy_to_clipboard';
import { Markdown } from '../../../../common/components/markdown';
import { WithHoverActions } from '../../../../common/components/with_hover_actions';
import * as i18n from '../translations';

const BodyContainer = styled(EuiPanel)`
  border: none;
`;

BodyContainer.displayName = 'BodyContainer';

export const NoteCardBody = React.memo<{ rawNote: string }>(({ rawNote }) => {
  const hoverContent = useMemo(
    () => (
      <EuiToolTip content={i18n.COPY_TO_CLIPBOARD}>
        <WithCopyToClipboard text={rawNote} titleSummary={i18n.NOTE.toLowerCase()} />
      </EuiToolTip>
    ),
    [rawNote]
  );

  const render = useCallback(() => <Markdown raw={rawNote} />, [rawNote]);

  return (
    <BodyContainer data-test-subj="note-card-body" hasShadow={false} paddingSize="s">
      <WithHoverActions hoverContent={hoverContent} render={render} />
    </BodyContainer>
  );
});

NoteCardBody.displayName = 'NoteCardBody';
