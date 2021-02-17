/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, ReactElement } from 'react';

import { i18n } from '@kbn/i18n';

interface ChildrenProps {
  toggle: () => void;
  isHidden: boolean;
  hiddenText: React.ReactNode;
}

interface Props {
  text: string;
  children(props: ChildrenProps): ReactElement;
}

export const HiddenText: React.FC<Props> = ({ text, children }) => {
  const [isHidden, toggleIsHidden] = useState(true);

  const hiddenLabel = i18n.translate('xpack.enterpriseSearch.hiddenText', {
    defaultMessage: 'Hidden text',
  });
  const hiddenText = isHidden ? (
    <span aria-label={hiddenLabel}>
      <span aria-hidden>{text.replace(/./g, '•')}</span>
    </span>
  ) : (
    text
  );

  return children({
    hiddenText,
    isHidden,
    toggle: () => toggleIsHidden(!isHidden),
  });
};
