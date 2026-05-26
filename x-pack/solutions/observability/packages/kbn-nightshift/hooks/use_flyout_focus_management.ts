/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useRef } from 'react';

/**
 * Manages focus and Escape-key behavior for push flyouts.
 *
 * - Saves the previously focused element before opening.
 * - Focuses the flyout close button when the flyout opens.
 * - Closes the flyout on Escape.
 * - Returns focus to the original element when the flyout closes.
 */
export function useFlyoutFocusManagement({
  isOpen,
  onClose,
  flyoutTestSubj,
}: {
  isOpen: boolean;
  onClose: () => void;
  flyoutTestSubj: string;
}) {
  const returnFocusRef = useRef<Element | null>(null);
  const wasOpenRef = useRef(false);

  const open = useCallback(() => {
    returnFocusRef.current = document.activeElement;
  }, []);

  // Restore focus when isOpen transitions from true → false
  useEffect(() => {
    if (wasOpenRef.current && !isOpen) {
      requestAnimationFrame(() => {
        (returnFocusRef.current as HTMLElement | null)?.focus();
      });
    }
    wasOpenRef.current = isOpen;
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const timerId = setTimeout(() => {
      const flyout = document.querySelector<HTMLElement>(`[data-test-subj="${flyoutTestSubj}"]`);
      const closeBtn = flyout?.querySelector<HTMLElement>(
        '[data-test-subj="euiFlyoutCloseButton"]'
      );
      closeBtn?.focus();
    }, 50);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      clearTimeout(timerId);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, flyoutTestSubj, onClose]);

  return { open };
}
