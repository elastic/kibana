/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { Prompt } from 'react-router-dom';

import { i18n } from '@kbn/i18n';

interface Props {
  hasUnsavedChanges: boolean;
}

export const UnsavedChangesPrompt: React.FC<Props> = ({ hasUnsavedChanges }) => {
  const handler = (event: BeforeUnloadEvent) => {
    if (hasUnsavedChanges) {
      event.preventDefault();
      event.returnValue = '';
    }
  };

  useEffect(() => {
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [hasUnsavedChanges]);

  return (
    <Prompt
      when={hasUnsavedChanges}
      message={i18n.translate('xpack.enterpriseSearch.shared.unsavedChangesMessage', {
        defaultMessage: 'Your changes have not been saved. Are you sure you want to leave?',
      })}
    />
  );
};
