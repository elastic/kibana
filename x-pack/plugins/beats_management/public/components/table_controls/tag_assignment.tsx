/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner } from '@elastic/eui';
import React from 'react';
import { TABLE_CONFIG } from '../../../common/constants';
import { TagBadge } from '../tag/tag_badge';

interface TagAssignmentProps {
  tag: any;
  assignTag(id: string): void;
}

interface TagAssignmentState {
  isFetchingTags: boolean;
}

export class TagAssignment extends React.PureComponent<TagAssignmentProps, TagAssignmentState> {
  constructor(props: TagAssignmentProps) {
    super(props);

    this.state = {
      isFetchingTags: false,
    };
  }

  public render() {
    const {
      assignTag,
      tag,
      tag: { id },
    } = this.props;

    return (
      <EuiFlexGroup gutterSize="xs" key={id}>
        {this.state.isFetchingTags && (
          <EuiFlexItem>
            <EuiLoadingSpinner size="m" />
          </EuiFlexItem>
        )}
        <EuiFlexItem>
          <TagBadge
            maxIdRenderSize={TABLE_CONFIG.TRUNCATE_TAG_LENGTH_SMALL}
            onClick={() => assignTag(id)}
            onClickAriaLabel={id}
            tag={tag}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
}
