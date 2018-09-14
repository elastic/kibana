/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/**
 * Handle key down events for the menu, including selecting the previous and
 * next items, making the item selection, closing the menu, etc.
 */
export const onKeyDownProvider = ({
  items,
  onSelect,
  isOpen,
  setIsOpen,
  selectedIndex,
  setSelectedIndex,
}) => e => {
  if (!isOpen || !items.length) return;
  const { key } = e;
  if (key === 'ArrowUp') {
    e.preventDefault();
    setSelectedIndex((selectedIndex - 1 + items.length) % items.length);
  } else if (key === 'ArrowDown') {
    e.preventDefault();
    setSelectedIndex((selectedIndex + 1) % items.length);
  } else if (['Enter', 'Tab'].includes(key) && selectedIndex >= 0) {
    e.preventDefault();
    onSelect(items[selectedIndex]);
    setSelectedIndex(-1);
  } else if (key === 'Escape') {
    setIsOpen(false);
  }
};

/**
 * On key press (character keys), show the menu. We don't want to willy nilly
 * show the menu whenever ANY key down event happens (like arrow keys) cuz that
 * would be just downright annoying.
 */
export const onKeyPressProvider = ({ setIsOpen, setSelectedIndex }) => () => {
  setIsOpen(true);
  setSelectedIndex(-1);
};
