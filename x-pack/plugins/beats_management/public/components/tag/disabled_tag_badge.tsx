/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiBadge } from '@elastic/eui';
import React from 'react';
import { TABLE_CONFIG } from '../../../common/constants';

interface TagBadgeProps {
  maxIdRenderSize?: number;
  id: string;
}

export const DisabledTagBadge = (props: TagBadgeProps) => {
  const { id, maxIdRenderSize } = props;
  const idRenderSize = maxIdRenderSize || TABLE_CONFIG.TRUNCATE_TAG_LENGTH;
  const idToRender = id.length > idRenderSize ? `${id.substring(0, idRenderSize)}...` : id;
  return (
    <EuiBadge color="default" iconType="cross">
      {idToRender}
    </EuiBadge>
  );
};
