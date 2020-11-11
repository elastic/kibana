/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
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
    <span aria-label={hiddenLabel}>{text.replace(/./g, '•')}</span>
  ) : (
    text
  );

  return children({
    hiddenText,
    isHidden,
    toggle: () => toggleIsHidden(!isHidden),
  });
};
