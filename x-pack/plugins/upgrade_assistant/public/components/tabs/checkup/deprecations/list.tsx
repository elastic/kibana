/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { StatelessComponent } from 'react';

import { DeprecationInfo } from 'src/legacy/core_plugins/elasticsearch';
import { EnrichedDeprecationInfo } from '../../../../../server/lib/es_migration_apis';
import { GroupByOption } from '../../../types';

import { CURRENT_MAJOR_VERSION } from 'x-pack/plugins/upgrade_assistant/common/version';
import { COLOR_MAP, LEVEL_MAP } from '../constants';
import { DeprecationCell } from './cell';
import { IndexDeprecationDetails, IndexDeprecationTable } from './index_table';

const OLD_INDEX_MESSAGE = `Index created before ${CURRENT_MAJOR_VERSION}.0`;
const DELETE_INDEX_MESSAGE = `.tasks index must be re-created`;
const NEEDS_DEFAULT_FIELD_MESSAGE = 'Number of fields exceeds automatic field expansion limit';

const sortByLevelDesc = (a: DeprecationInfo, b: DeprecationInfo) => {
  return -1 * (LEVEL_MAP[a.level] - LEVEL_MAP[b.level]);
};

/**
 * Used to show a single deprecation message with any detailed information.
 */
const MessageDeprecation: StatelessComponent<{ deprecation: EnrichedDeprecationInfo }> = ({
  deprecation,
}) => {
  const items = [];

  if (deprecation.details) {
    items.push({ body: deprecation.details });
  }

  return (
    <DeprecationCell
      headline={deprecation.message}
      healthColor={COLOR_MAP[deprecation.level]}
      indexName={deprecation.index}
      reindex={deprecation.message === OLD_INDEX_MESSAGE}
      deleteIndex={deprecation.message === DELETE_INDEX_MESSAGE}
      needsDefaultFields={deprecation.message === NEEDS_DEFAULT_FIELD_MESSAGE}
      docUrl={deprecation.url}
      items={items}
    />
  );
};

/**
 * Used to show a single (simple) deprecation message with any detailed information.
 */
const SimpleMessageDeprecation: StatelessComponent<{ deprecation: EnrichedDeprecationInfo }> = ({
  deprecation,
}) => {
  const items = [];

  if (deprecation.details) {
    items.push({ body: deprecation.details });
  }

  return <DeprecationCell items={items} docUrl={deprecation.url} />;
};

interface IndexDeprecationProps {
  deprecation: DeprecationInfo;
  indices: IndexDeprecationDetails[];
}

/**
 * Shows a single deprecation and table of affected indices with details for each index.
 */
const IndexDeprecation: StatelessComponent<IndexDeprecationProps> = ({ deprecation, indices }) => {
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
export const DeprecationList: StatelessComponent<{
  deprecations: EnrichedDeprecationInfo[];
  currentGroupBy: GroupByOption;
}> = ({ deprecations, currentGroupBy }) => {
  // If we're grouping by message and the first deprecation has an index field, show an index
  // group deprecation. Otherwise, show each message.
  if (currentGroupBy === GroupByOption.message && deprecations[0].index !== undefined) {
    // We assume that every deprecation message is the same issue (since they have the same
    // message) and that each deprecation will have an index associated with it.
    const indices = deprecations.map(dep => ({
      index: dep.index!,
      details: dep.details,
      reindex: dep.message === OLD_INDEX_MESSAGE,
      delete: dep.message === DELETE_INDEX_MESSAGE,
      needsDefaultFields: dep.message === NEEDS_DEFAULT_FIELD_MESSAGE,
    }));

    return <IndexDeprecation indices={indices} deprecation={deprecations[0]} />;
  } else if (currentGroupBy === GroupByOption.index) {
    return (
      <div>
        {deprecations.sort(sortByLevelDesc).map(dep => (
          <MessageDeprecation deprecation={dep} key={dep.message} />
        ))}
      </div>
    );
  } else {
    return (
      <div>
        {deprecations.sort(sortByLevelDesc).map(dep => (
          <SimpleMessageDeprecation deprecation={dep} key={dep.message} />
        ))}
      </div>
    );
  }
};
