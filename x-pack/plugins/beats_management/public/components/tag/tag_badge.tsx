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
  tag: { name: string; color: string; disabled?: boolean; id: string };
}

export const TagBadge = (props: TagBadgeProps) => {
  const { iconType, onClick, onClickAriaLabel, tag } = props;
  const maxIdRenderSize = props.maxIdRenderSize || TABLE_CONFIG.TRUNCATE_TAG_LENGTH;
  const idToRender = `${tag.name.substring(0, maxIdRenderSize)}${
    tag.name.length > maxIdRenderSize ? '...' : ''
  }`;

  return (
    <EuiBadge
      color={tag.disabled ? 'default' : tag.color || 'primary'}
      iconType={tag.disabled ? 'cross' : iconType}
      onClick={tag.disabled ? undefined : onClick}
      onClickAriaLabel={tag.disabled ? undefined : onClickAriaLabel}
    >
      {idToRender}
    </EuiBadge>
  );
};
