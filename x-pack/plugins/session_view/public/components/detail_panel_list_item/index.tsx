/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState, ReactNode } from 'react';
import { EuiText, EuiTextProps } from '@elastic/eui';
import { CSSObject } from '@emotion/react';
import { useStyles } from './styles';

interface DetailPanelListItemDeps {
  children: ReactNode;
  copy?: ReactNode;
  display?: string;
}

interface EuiTextPropsCss extends EuiTextProps {
  css: CSSObject;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

/**
 * Detail panel description list item.
 */
export const DetailPanelListItem = ({
  children,
  copy,
  display = 'flex',
}: DetailPanelListItemDeps) => {
  const [isHovered, setIsHovered] = useState(false);
  const styles = useStyles({ display });

  const props: EuiTextPropsCss = {
    size: 's',
    css: !!copy ? styles.copiableItem : styles.item,
  };

  if (!!copy) {
    props.onMouseEnter = () => setIsHovered(true);
    props.onMouseLeave = () => setIsHovered(false);
  }

  return (
    <EuiText {...props} data-test-subj="sessionView:detail-panel-list-item">
      {children}
      {isHovered && copy}
    </EuiText>
  );
};
