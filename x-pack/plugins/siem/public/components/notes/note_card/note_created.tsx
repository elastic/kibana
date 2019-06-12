/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FormattedRelative } from '@kbn/i18n/react';
import * as React from 'react';
import { pure } from 'recompose';
import styled from 'styled-components';

import { LocalizedDateTooltip } from '../../localized_date_tooltip';

const NoteCreatedContainer = styled.span`
  user-select: none;
`;

export const NoteCreated = pure<{ created: Date }>(({ created }) => (
  <NoteCreatedContainer data-test-subj="note-created">
    <LocalizedDateTooltip date={created}>
      <FormattedRelative value={created} />
    </LocalizedDateTooltip>
  </NoteCreatedContainer>
));
