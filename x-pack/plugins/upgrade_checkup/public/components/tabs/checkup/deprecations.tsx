/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { StatelessComponent } from 'react';

import { EuiAccordion, EuiSpacer, EuiText } from '@elastic/eui';

import { DeprecationInfo } from 'src/core_plugins/elasticsearch';
import { EnrichedDeprecationInfo } from '../../../../server/lib/es_migration_apis';
import { DeprecationCell } from './cell';
import { ACTION_MAP, COLOR_MAP, LEVEL_MAP } from './constants';
import { DeprecationHealth } from './health';
import { IndexDeprecationDetails, IndexDeprecationTable } from './index_table';
import { GroupByOption, LevelFilterOption } from './types';

const sortByLevelDesc = (a: DeprecationInfo, b: DeprecationInfo) => {
  return -1 * (LEVEL_MAP[a.level] - LEVEL_MAP[b.level]);
};

const filterDeps = (levels: Set<LevelFilterOption>) => (dep: DeprecationInfo) => {
  return levels.has(dep.level as LevelFilterOption);
};

/**
 * Used to show a single deprecation message with any detailed information.
 */
const MessageDeprecation: StatelessComponent<{ deprecation: EnrichedDeprecationInfo }> = ({
  deprecation,
}) => {
  const items = [];

  const action = ACTION_MAP[deprecation.level];
  if (action) {
    items.push({ body: action });
  }

  if (deprecation.details) {
    items.push({ title: 'Details', body: deprecation.details });
  }

  return (
    <DeprecationCell
      headline={deprecation.message}
      healthColor={COLOR_MAP[deprecation.level]}
      uiButton={deprecation.uiButton}
      docUrl={deprecation.url}
      items={items}
    />
  );
};

interface DeprecationSummary {
  message: string;
  url: string;
  level: string;
}

interface IndexDeprecationProps {
  deprecation: DeprecationSummary;
  indices: IndexDeprecationDetails[];
}

/**
 * Shows a single deprecation and table of affected indices with details for each index.
 */
const IndexDeprecation: StatelessComponent<IndexDeprecationProps> = ({ deprecation, indices }) => {
  const items = [];

  const action = ACTION_MAP[deprecation.level];
  if (action) {
    items.push({ body: action });
  }

  return (
    <DeprecationCell
      headline={deprecation.message}
      healthColor={COLOR_MAP[deprecation.level]}
      docUrl={deprecation.url}
      items={items}
    >
      <IndexDeprecationTable indices={indices} />
    </DeprecationCell>
  );
};

/**
 * A list of deprecations that is either shown as individual deprecation cells or as a
 * deprecation summary for a list of indices.
 */
const DeprecationList: StatelessComponent<{
  deprecations: EnrichedDeprecationInfo[];
  currentGroupBy: GroupByOption;
}> = ({ deprecations, currentGroupBy }) => {
  // If we're grouping by message and the first deprecation has an index field, show an index
  // group deprecation. Otherwise, show each message.
  if (currentGroupBy === GroupByOption.message && deprecations[0].index !== undefined) {
    // If we're grouping by index we assume that every deprecation message is the same
    // issue and that each deprecation will have an index associated with it.
    const indices = deprecations.map(dep => ({ index: dep.index!, details: dep.details }));

    return <IndexDeprecation indices={indices} deprecation={deprecations[0]} />;
  } else {
    return (
      <div>
        {deprecations.sort(sortByLevelDesc).map(dep => (
          <MessageDeprecation deprecation={dep} key={dep.message} />
        ))}
      </div>
    );
  }
};

interface GroupedDeprecationsProps {
  currentFilter: Set<LevelFilterOption>;
  currentGroupBy: GroupByOption;
  deprecations?: EnrichedDeprecationInfo[];
}

/**
 * Displays groups of deprecation messages in an accordion.
 */
export const GroupedDeprecations: StatelessComponent<GroupedDeprecationsProps> = ({
  currentGroupBy,
  deprecations,
  currentFilter,
}) => {
  deprecations = (deprecations || []).filter(filterDeps(currentFilter));
  if (deprecations.length === 0) {
    return (
      <EuiText color="subdued">
        <p>No deprecations.</p>
      </EuiText>
    );
  }

  const groups = _.groupBy(deprecations, currentGroupBy);

  return (
    <div>
      {Object.keys(groups)
        .sort()
        .map(groupName => [
          <EuiAccordion
            key={`acc-${groupName}`}
            id={`depgroup-${groupName}`}
            buttonContent={groupName}
            extraAction={<DeprecationHealth deprecations={groups[groupName]} />}
          >
            <EuiSpacer />
            <DeprecationList deprecations={groups[groupName]} currentGroupBy={currentGroupBy} />
          </EuiAccordion>,
          <EuiSpacer key={`spc-${groupName}`} />,
        ])}
    </div>
  );
};
