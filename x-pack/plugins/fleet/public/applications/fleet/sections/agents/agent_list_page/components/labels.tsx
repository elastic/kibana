/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiToolTip } from '@elastic/eui';
import { take } from 'lodash';
import React from 'react';

interface Props {
  tags: string[];
}

const MAX_TAGS_TO_DISPLAY = 3;

export const Labels: React.FunctionComponent<Props> = ({ tags }) => {
  return (
    <>
      {tags.length > MAX_TAGS_TO_DISPLAY ? (
        <>
          <EuiToolTip content={tags.join(', ')}>
            <>
              {take(tags, 3).join(', ')} + {tags.length - MAX_TAGS_TO_DISPLAY} more
            </>
          </EuiToolTip>
        </>
      ) : (
        tags.join(', ')
      )}
    </>
  );
};
