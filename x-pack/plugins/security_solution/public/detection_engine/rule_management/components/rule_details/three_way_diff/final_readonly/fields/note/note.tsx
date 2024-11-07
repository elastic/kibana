/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiDescriptionList } from '@elastic/eui';
import * as i18n from './translations';
import type { InvestigationGuide } from '../../../../../../../../../common/api/detection_engine';
import { MarkdownRenderer } from '../../../../../../../../common/components/markdown_editor';

interface NoteReadOnlyProps {
  note: InvestigationGuide;
}

export function NoteReadOnly({ note }: NoteReadOnlyProps) {
  return (
    <EuiDescriptionList
      listItems={[
        {
          title: i18n.NOTE_LABEL,
          description: <Note note={note} />,
        },
      ]}
    />
  );
}

interface NoteProps {
  note: InvestigationGuide;
}

function Note({ note }: NoteProps) {
  return <MarkdownRenderer textSize="s">{note}</MarkdownRenderer>;
}
