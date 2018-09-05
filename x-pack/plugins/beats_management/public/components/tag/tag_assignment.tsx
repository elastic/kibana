/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner } from '@elastic/eui';
import React from 'react';
import { BeatTag, CMPopulatedBeat } from '../../../common/domain_types';

interface TagAssignmentProps {
  selectedBeats: CMPopulatedBeat[];
  tag: BeatTag;
  assignTagsToBeats(selectedBeats: any, tag: any): void;
  removeTagsFromBeats(selectedBeats: any, tag: any): void;
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
      assignTagsToBeats,
      removeTagsFromBeats,
      selectedBeats,
      tag,
      tag: { id, color },
    } = this.props;

    const hasMatches = selectedBeats.some(({ tags }: CMPopulatedBeat) =>
      (tags || []).some((t: string) => t === id)
    );

    return (
      <EuiFlexGroup gutterSize="xs" key={`${id}-${hasMatches ? 'matched' : 'unmatched'}`}>
        {this.state.isFetchingTags && (
          <EuiFlexItem>
            <EuiLoadingSpinner size="m" />
          </EuiFlexItem>
        )}
        <EuiFlexItem>
          <EuiBadge
            color={color}
            iconType={hasMatches ? 'cross' : undefined}
            onClick={() => {
              this.setState({ isFetchingTags: true });
              hasMatches
                ? removeTagsFromBeats(selectedBeats, tag)
                : assignTagsToBeats(selectedBeats, tag);
              this.setState({ isFetchingTags: false });
            }}
            onClickAriaLabel={id}
          >
            {id}
          </EuiBadge>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
}
