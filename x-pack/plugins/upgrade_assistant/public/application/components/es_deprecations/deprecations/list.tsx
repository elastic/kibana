/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent } from 'react';

import { DeprecationInfo, EnrichedDeprecationInfo } from '../../../../../common/types';
import { GroupByOption } from '../../types';

import { COLOR_MAP, LEVEL_MAP } from '../../constants';
import { DeprecationCell } from './cell';
import { IndexDeprecationDetails, IndexDeprecationTable } from './index_table';

const sortByLevelDesc = (a: DeprecationInfo, b: DeprecationInfo) => {
  return -1 * (LEVEL_MAP[a.level] - LEVEL_MAP[b.level]);
};

/**
 * Used to show a single deprecation message with any detailed information.
 */
const MessageDeprecation: FunctionComponent<{
  deprecation: EnrichedDeprecationInfo;
}> = ({ deprecation }) => {
  const items = [];

  if (deprecation.details) {
    items.push({ body: deprecation.details });
  }

  return (
    <DeprecationCell
      reindexBlocker={deprecation.blockerForReindexing}
      headline={deprecation.message}
      healthColor={COLOR_MAP[deprecation.level]}
      reindexIndexName={deprecation.reindex ? deprecation.index! : undefined}
      deprecatedIndexSettings={deprecation.deprecatedIndexSettings}
      docUrl={deprecation.url}
      items={items}
    />
  );
};

/**
 * Used to show a single (simple) deprecation message with any detailed information.
 */
const SimpleMessageDeprecation: FunctionComponent<{ deprecation: EnrichedDeprecationInfo }> = ({
  deprecation,
}) => {
  const items = [];

  if (deprecation.details) {
    items.push({ body: deprecation.details });
  }

  return (
    <DeprecationCell
      reindexBlocker={deprecation.blockerForReindexing}
      items={items}
      docUrl={deprecation.url}
      deprecatedIndexSettings={deprecation.deprecatedIndexSettings}
    />
  );
};

interface IndexDeprecationProps {
  deprecation: EnrichedDeprecationInfo;
  indices: IndexDeprecationDetails[];
}

/**
 * Shows a single deprecation and table of affected indices with details for each index.
 */
const IndexDeprecation: FunctionComponent<IndexDeprecationProps> = ({ deprecation, indices }) => {
  return (
    <DeprecationCell docUrl={deprecation.url}>
      <IndexDeprecationTable indices={indices} />
    </DeprecationCell>
  );
};

/**
 * A list of deprecations that is either shown as individual deprecation cells or as a
 * deprecation summary for a list of indices.
 */
export const EsDeprecationList: FunctionComponent<{
  deprecations: EnrichedDeprecationInfo[];
  currentGroupBy: GroupByOption;
}> = ({ deprecations, currentGroupBy }) => {
  // If we're grouping by message and the first deprecation has an index field, show an index
  // group deprecation. Otherwise, show each message.
  if (currentGroupBy === GroupByOption.message && deprecations[0].index !== undefined) {
    // We assume that every deprecation message is the same issue (since they have the same
    // message) and that each deprecation will have an index associated with it.
    const indices = deprecations.map((dep) => ({
      index: dep.index!,
      details: dep.details,
      reindex: dep.reindex === true,
      deprecatedIndexSettings: dep.deprecatedIndexSettings,
      blockerForReindexing: dep.blockerForReindexing,
    }));
    return <IndexDeprecation indices={indices} deprecation={deprecations[0]} />;
  } else if (currentGroupBy === GroupByOption.index) {
    return (
      <div>
        {deprecations.sort(sortByLevelDesc).map((dep, index) => (
          <MessageDeprecation deprecation={dep} key={`${dep.message}-${index}`} />
        ))}
      </div>
    );
  } else {
    return (
      <div>
        {deprecations.sort(sortByLevelDesc).map((dep, index) => (
          <SimpleMessageDeprecation deprecation={dep} key={`${dep.message}-${index}`} />
        ))}
      </div>
    );
  }
};
