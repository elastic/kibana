/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { ADD_VISUALIZATION } from './translations';

const DISABLED_CLASSNAME = 'euiButtonIcon-isDisabled';

export const useLensButtonToggle = () => {
  const enableLensButton = useCallback(({ editorRef }) => {
    if (editorRef && editorRef.textarea && editorRef.toolbar) {
      const lensPluginButton = editorRef.toolbar?.querySelector(
        `[aria-label="${ADD_VISUALIZATION}"]`
      );

      if (lensPluginButton) {
        const isDisabled = lensPluginButton.className.includes(DISABLED_CLASSNAME);

        if (isDisabled) {
          lensPluginButton.className = lensPluginButton.className.replace(DISABLED_CLASSNAME, '');
          lensPluginButton.setAttribute(
            'style',
            lensPluginButton.getAttribute('style').replace('pointer-events: none;', '')
          );
        }
      }
    }
  }, []);

  const disableLensButton = useCallback(({ editorRef }) => {
    if (editorRef && editorRef.textarea && editorRef.toolbar) {
      const lensPluginButton = editorRef.toolbar?.querySelector(
        `[aria-label="${ADD_VISUALIZATION}"]`
      );

      if (lensPluginButton) {
        const isDisabled = lensPluginButton.className.includes(DISABLED_CLASSNAME);

        if (!isDisabled) {
          lensPluginButton.className += ` ${DISABLED_CLASSNAME}`;
          lensPluginButton.setAttribute('style', 'pointer-events: none;');
        }
      }
    }
  }, []);

  return { enableLensButton, disableLensButton };
};
