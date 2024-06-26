/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { Prompt } from 'react-router-dom';
import { i18n } from '@kbn/i18n';

interface UnsavedChangesCalloutProps {
  hasUnsavedChanges: boolean;
}

export const UnsavedChangesCallout: React.FC<UnsavedChangesCalloutProps> = ({
  hasUnsavedChanges,
}) => {
  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        // These 2 lines of code are the recommendation from MDN for triggering a browser prompt for confirming
        // whether or not a user wants to leave the current site.
        event.preventDefault();
        event.returnValue = '';
      }
    };
    // Adding this handler will prompt users if they are navigating to a new page, outside of the Kibana SPA
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [hasUnsavedChanges]);

  // Adding this Prompt will prompt users if they are navigating to a new page, within the Kibana SPA
  return (
    <Prompt
      when={hasUnsavedChanges}
      message={i18n.translate('xpack.idxMgmt.indexDetails.mappings.discardPromptTitle', {
        defaultMessage:
          'You will lose these unsaved changes if you continue. Are you sure you want to leave?',
      })}
    />
  );
};
