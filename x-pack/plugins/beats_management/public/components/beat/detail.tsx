/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  // @ts-ignore EuiInMemoryTable typings not yet available
  EuiInMemoryTable,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { flatten } from 'lodash';
import React from 'react';
import { CMPopulatedBeat } from '../../../common/domain_types';
import { ClientSideBeatTag } from '../../lib/lib';

interface BeatDetailProps {
  beat: CMPopulatedBeat | undefined;
}

export const BeatDetailView = (props: BeatDetailProps) => {
  const { beat } = props;
  if (!beat) {
    return <div>Beat not found</div>;
  }
  const configurationBlocks = flatten(
    beat.full_tags.map((tag: ClientSideBeatTag) => {
      return tag.configurations.map(configuration => ({
        ...configuration,
        tagId: tag.id,
        tagColor: tag.color,
      }));
    })
  );

  const columns = [
    {
      field: 'type',
      name: 'Type',
      sortable: true,
    },
    {
      field: 'description',
      name: 'Description',
      sortable: true,
    },
    {
      field: 'tagId',
      name: 'Tag',
      render: (id: string, block: any) => {
        return <EuiBadge color={block.tagColor}>{id}</EuiBadge>;
      },
      sortable: true,
    },
  ];
  return (
    <EuiFlexGroup>
      <EuiFlexItem>
        <EuiTitle size="xs">
          <h4>Configurations</h4>
        </EuiTitle>
        <EuiText size="s">
          <p>
            You can have multiple configurations applied to an individual tag. These configurations
            can repeat or mix types as necessary. For example, you may utilize three metricbeat
            configurations alongside one input and filebeat configuration.
          </p>
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiInMemoryTable columns={columns} items={configurationBlocks} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
