/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiBadge } from '@elastic/eui';
import { RawTagWithId } from '../../../common';

export interface Props {
  tag: RawTagWithId;
}

export const Tag: React.FC<Props> = ({ tag }) => {
  return <EuiBadge color={tag.color}>{tag.title}</EuiBadge>;
};
