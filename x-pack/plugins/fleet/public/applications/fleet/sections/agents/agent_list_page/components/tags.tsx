/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiToolTip } from '@elastic/eui';
import { take } from 'lodash';
import React from 'react';

import { truncateTag, MAX_TAG_DISPLAY_LENGTH } from '../utils';

interface Props {
  tags: string[];
}

// Number of tags displayed before "+ N more" is displayed
const MAX_TAGS_TO_DISPLAY = 3;

export const Tags: React.FunctionComponent<Props> = ({ tags }) => {
  return (
    <>
      {tags.length > MAX_TAGS_TO_DISPLAY ? (
        <>
          <EuiToolTip content={<span data-test-subj="agentTagsTooltip">{tags.join(', ')}</span>}>
            <span data-test-subj="agentTags">
              {take(tags, 3).map(truncateTag).join(', ')} + {tags.length - MAX_TAGS_TO_DISPLAY} more
            </span>
          </EuiToolTip>
        </>
      ) : (
        <span data-test-subj="agentTags">
          {tags.map((tag, index) => (
            <>
              {index > 0 && ', '}
              {tag.length > MAX_TAG_DISPLAY_LENGTH ? (
                <EuiToolTip content={<span>{tag}</span>} key={tag}>
                  <span>{truncateTag(tag)}</span>
                </EuiToolTip>
              ) : (
                <span key={tag}>{tag}</span>
              )}
            </>
          ))}
        </span>
      )}
    </>
  );
};
