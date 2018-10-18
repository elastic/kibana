/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiBadge } from '@elastic/eui';
import React from 'react';
import { TABLE_CONFIG } from '../../../common/constants';

interface TagBadgeProps {
  iconType?: any;
  onClick?: () => void;
  onClickAriaLabel?: string;
  maxIdRenderSize?: number;
  tag: { color?: string; id: string };
}

export const TagBadge = (props: TagBadgeProps) => {
  const {
    iconType,
    onClick,
    onClickAriaLabel,
    tag: { color, id },
  } = props;

  const maxIdRenderSize = props.maxIdRenderSize || TABLE_CONFIG.TRUNCATE_TAG_LENGTH;
  const idToRender = id.length > maxIdRenderSize ? `${id.substring(0, maxIdRenderSize)}...` : id;
  return (
    <EuiBadge
      color={color || 'primary'}
      iconType={iconType}
      onClick={onClick}
      onClickAriaLabel={onClickAriaLabel}
    >
      {idToRender}
    </EuiBadge>
  );
};
