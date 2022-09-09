/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  KeyboardEventHandler,
  KeyboardEvent,
  MutableRefObject,
  PropsWithChildren,
} from 'react';
import React, { memo, useCallback, useMemo, useRef } from 'react';
import { pick } from 'lodash';
import { useTestIdGenerator } from '../../../../../hooks/use_test_id_generator';
import { useDataTestSubj } from '../../../hooks/state_selectors/use_data_test_subj';

const getEventDetails = (
  ev: KeyboardEvent
): Pick<
  KeyboardEvent<HTMLDivElement>,
  'key' | 'altKey' | 'ctrlKey' | 'keyCode' | 'metaKey' | 'repeat' | 'shiftKey'
> => {
  return pick(ev, ['key', 'altKey', 'ctrlKey', 'keyCode', 'metaKey', 'repeat', 'shiftKey']);
};

interface InputFocusInterface {
  focus: (force?: boolean) => void;
  blur: () => void;
}

export type InputCaptureProps = PropsWithChildren<{
  onCapture: (params: {
    /** The keyboard key value that was entered by the user */
    value: string | undefined;
    /** Any text that is selected/highlighted when user clicked the keyboard key */
    selection: string;
    /** Keyboard control keys from the keyboard event */
    eventDetails: Pick<
      KeyboardEvent,
      'key' | 'altKey' | 'ctrlKey' | 'keyCode' | 'metaKey' | 'repeat' | 'shiftKey'
    >;
  }) => void;
  focusRef?: MutableRefObject<InputFocusInterface | null>;
  onStateChange?: (isCapturing: boolean) => void; // FIXME:PT Is this needed in this new component?
}>;

/**
 * Component that will capture keyboard and other user input (ex. paste) for the area that it wraps (children)
 */
export const InputCapture = memo<InputCaptureProps>(({ onCapture, focusRef, children }) => {
  const getTestId = useTestIdGenerator(useDataTestSubj());
  // Reference to the `<div>` that take in focus (`tabIndex`)
  const focusEleRef = useRef<HTMLDivElement | null>(null);

  const getTextSelection = useCallback((): string => {
    if (focusEleRef.current) {
      const selection = document.getSelection();
      const selectionText = selection?.toString() ?? '';

      if (!selection || selectionText.length === 0) {
        return '';
      }

      // Determine if the text selection is only from inside of the text input area
      // (ex. User could have selected text that also capture content outside of the input area)
      if (
        focusEleRef.current?.contains(selection.focusNode) &&
        focusEleRef.current?.contains(selection.anchorNode)
      ) {
        return selectionText;
      }

      return '';
    }

    return '';
  }, []);

  const handleOnKeyDown = useCallback<KeyboardEventHandler<HTMLDivElement>>(
    (ev) => {
      // FIXME:PT implement

      onCapture({
        value: ev.key,
        selection: getTextSelection(),
        eventDetails: getEventDetails(ev),
      });
    },
    [getTextSelection, onCapture]
  );

  const handleOnPaste = useCallback(() => {
    // FIXME:PT implement from candice PR
  }, []);

  const focusInterface = useMemo<InputFocusInterface>(() => {
    return {
      focus: (force: boolean = false) => {
        // If user selected text and `force` is not true, then don't focus (else they lose selection)
        if (
          (!force && (window.getSelection()?.toString() ?? '').length > 0) ||
          document.activeElement === focusEleRef.current
        ) {
          return;
        }

        focusEleRef.current?.focus();
      },

      blur: () => {
        // only blur if the input has focus
        if (focusEleRef.current && document.activeElement === focusEleRef.current) {
          focusEleRef.current?.blur();
        }
      },
    };
  }, []);

  if (focusRef) {
    focusRef.current = focusInterface;
  }

  return (
    <div
      data-test-subj={getTestId('inputCapture')}
      onKeyDown={handleOnKeyDown}
      onPaste={handleOnPaste}
    >
      <div tabIndex={0} ref={focusEleRef}>
        {children}
      </div>
    </div>
  );
});
InputCapture.displayName = 'InputCapture';
