/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import { EuiLink, EuiBadge, EuiCodeBlock, EuiIcon } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { hasVisibleChild } from '../utils';
import { useHighlightTreeNode } from '../use_highlight_tree_node';
import { msToPretty } from '../../../utils';

import { PercentageBadge } from '../../percentage_badge';

import { Index, Operation, Shard } from '../../../types';

export interface Props {
  index: Index;
  shard: Shard;
  operation: Operation;
}

const TAB_WIDTH_PX = 32;

const limitString = (string: string, limit: number) =>
  `${string.slice(0, limit)}${string.length > limit ? '...' : ''}`;

/**
 * This component recursively renders a tree
 */
export const ShardDetailsTreeNode = ({ operation, index, shard }: Props) => {
  const [childrenVisible, setChildrenVisible] = useState(hasVisibleChild(operation));
  const { highlight, isHighlighted, id } = useHighlightTreeNode();

  const renderTimeRow = (op: Operation) => (
    <div className="prfDevTool__profileTree__tvRow">
      <div className="prfDevTool__profileTree__cell euiTextAlign--left">
        {op.hasChildren ? (
          <EuiLink
            className="prfDevTool__profileTree__shardDetails"
            disabled={!op.hasChildren}
            onClick={() => setChildrenVisible(!childrenVisible)}
          >
            <EuiIcon type={childrenVisible ? 'arrowDown' : 'arrowRight'} />

            {' ' + op.query_type}
          </EuiLink>
        ) : (
          <>
            <EuiIcon type="dot" />
            {' ' + op.query_type}
          </>
        )}
      </div>
      {/* Self Time Badge */}
      <div className="prfDevTool__profileTree__cell prfDevTool__profileTree__time euiTextAlign--center">
        <EuiBadge
          className="prfDevTool__profileTree__badge euiTextAlign--center"
          style={{ backgroundColor: op.absoluteColor }}
        >
          {msToPretty(op.selfTime || 0, 1)}
        </EuiBadge>
      </div>
      {/* Total Time Badge */}
      <div className="prfDevTool__profileTree__cell prfDevTool__profileTree__totalTime">
        <EuiBadge
          className="prfDevTool__profileTree__badge euiTextAlign--center"
          style={{ backgroundColor: op.absoluteColor }}
        >
          {msToPretty(op.time, 1)}
        </EuiBadge>
      </div>
      {/* Time percentage Badge */}
      <div className="prfDevTool__profileTree__cell prfDevTool__profileTree__percentage">
        <PercentageBadge timePercentage={op.timePercentage} label={op.timePercentage + '%'} />
      </div>
    </div>
  );

  return (
    <>
      <div
        key={id}
        className={isHighlighted() ? 'prfDevTool__tvRow--last' : ''}
        style={{ paddingLeft: operation.depth! * TAB_WIDTH_PX + 'px' }}
      >
        {renderTimeRow(operation)}
        <div className="prfDevTool__profileTree__tvRow">
          <span className="prfDevTool__detail">
            <EuiCodeBlock paddingSize="none">
              {limitString(operation.lucene || '', 120)}
            </EuiCodeBlock>
            <EuiLink
              type="button"
              data-test-subj="viewShardDetails"
              onClick={() => highlight({ indexName: index.name, operation, shard })}
            >
              {i18n.translate('xpack.searchProfiler.profileTree.body.viewDetailsLabel', {
                defaultMessage: 'View details',
              })}
            </EuiLink>
          </span>
        </div>
      </div>
      {childrenVisible &&
        operation.hasChildren &&
        operation.children.map((childOp, idx) => (
          <ShardDetailsTreeNode key={idx} operation={childOp} index={index} shard={shard} />
        ))}
    </>
  );
};
