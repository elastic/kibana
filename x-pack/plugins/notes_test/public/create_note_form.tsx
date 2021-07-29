/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { EuiButton, EuiFieldText, EuiForm, EuiFormRow, EuiText, EuiTextArea } from '@elastic/eui';

import type { Services } from './services';

interface Props {
  services: Services;
  onAfterCreate: () => void;
}

export function CreateNoteForm({ services, onAfterCreate }: Props) {
  const [subject, setSubject] = useState<string>('');
  const [text, setText] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [isInvalid, setIsInvalid] = useState(false);

  const saveNote = useCallback(async () => {
    if (isSaving) return;
    setIsSaving(true);

    if (!subject || !text) {
      setIsInvalid(true);
    } else {
      setIsInvalid(false);
      await services.createNote(subject, text);
      setSubject('');
      setText('');
      services.addSuccessToast('Note created!');
      onAfterCreate();
    }

    setIsSaving(false);
  }, [subject, text, services, isSaving, onAfterCreate]);

  return (
    <>
      <EuiForm isInvalid={isInvalid} error="Subject and body text are required">
        <EuiFormRow>
          <EuiText>Create a new note</EuiText>
        </EuiFormRow>
        <EuiFormRow>
          <EuiFieldText
            placeholder="Subject"
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
          />
        </EuiFormRow>
        <EuiFormRow>
          <EuiTextArea
            placeholder="Body text"
            value={text}
            onChange={(event) => setText(event.target.value)}
          />
        </EuiFormRow>
        <EuiFormRow>
          <EuiButton onClick={saveNote}>Save</EuiButton>
        </EuiFormRow>
      </EuiForm>
    </>
  );
}
