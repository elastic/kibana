/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, ReactElement } from 'react';

interface ChildrenProps {
  toggle: () => void;
  isHidden: boolean;
  hiddenText: string;
}

interface Props {
  text: string;
  children(props: ChildrenProps): ReactElement;
}

export const HiddenText: React.FC<Props> = ({ text, children }) => {
  const [isHidden, toggleIsHidden] = useState(true);
  const hiddenText = isHidden ? text.replace(/./g, '*') : text;

  return children({
    hiddenText,
    isHidden,
    toggle: () => toggleIsHidden(!isHidden),
  });
};
