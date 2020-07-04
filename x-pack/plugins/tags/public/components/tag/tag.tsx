/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiBadge } from '@elastic/eui';
import { RawTagWithId } from '../../../common';

export type TagView = Pick<RawTagWithId, 'color' | 'title'> &
  Partial<Pick<RawTagWithId, 'key' | 'value'>>;

export interface Props {
  tag: TagView;
}

export const Tag: React.FC<Props> = React.memo(({ tag }) => {
  const content = tag.key ? (
    <>
      {tag.key}
      {!!tag.value ? ':' : null}
      {!!tag.value ? <strong> {tag.value}</strong> : null}
    </>
  ) : (
    tag.title
  );

  return <EuiBadge color={tag.color}>{content}</EuiBadge>;
});
