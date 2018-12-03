/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, StatelessComponent } from 'react';

import {
  EuiAccordion,
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';

import { DeprecationInfo } from 'src/core_plugins/elasticsearch';
import { EnrichedDeprecationInfo } from '../../../../server/lib/es_migration_apis';
import { GroupByOption, LevelFilterOption } from '../../types';
import { DeprecationCell } from './cell';
import { COLOR_MAP, LEVEL_MAP } from './constants';
import { DeprecationHealth } from './health';
import { IndexDeprecationDetails, IndexDeprecationTable } from './index_table';

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

  if (deprecation.details) {
    items.push({ body: deprecation.details });
  }

  return (
    <DeprecationCell
      headline={deprecation.message}
      healthColor={COLOR_MAP[deprecation.level]}
      actions={deprecation.actions}
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
const DeprecationList: StatelessComponent<{
  deprecations: EnrichedDeprecationInfo[];
  currentGroupBy: GroupByOption;
}> = ({ deprecations, currentGroupBy }) => {
  // If we're grouping by message and the first deprecation has an index field, show an index
  // group deprecation. Otherwise, show each message.
  if (currentGroupBy === GroupByOption.message && deprecations[0].index !== undefined) {
    // If we're grouping by index we assume that every deprecation message is the same
    // issue and that each deprecation will have an index associated with it.
    const indices = deprecations.map(dep => ({
      index: dep.index!,
      details: dep.details,
      actions: dep.actions,
    }));

    return <IndexDeprecation indices={indices} deprecation={deprecations[0]} />;
  } else if (currentGroupBy === GroupByOption.index) {
    // If we're grouping by index show all info for each message
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

interface GroupedDeprecationsProps {
  currentFilter: Set<LevelFilterOption>;
  currentGroupBy: GroupByOption;
  allDeprecations?: EnrichedDeprecationInfo[];
}

/**
 * Displays groups of deprecation messages in an accordion.
 */
export const GroupedDeprecations: StatelessComponent<GroupedDeprecationsProps> = ({
  currentGroupBy,
  allDeprecations = [],
  currentFilter,
}) => {
  const deprecations = allDeprecations.filter(filterDeps(currentFilter));

  // Display number of results shown
  const showMoreMessage = deprecations.length === 0 ? '. Change filters to show more.' : '';

  const message =
    allDeprecations.length === 0
      ? `No deprecations`
      : `Showing ${deprecations.length} of ${allDeprecations.length}${showMoreMessage}`;

  const groups = _.groupBy(deprecations, currentGroupBy);

  return (
    <div>
      <EuiFlexGroup responsive={false} alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty flush="left" size="s">
            Expand all
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty flush="left" size="s">
            Collapse all
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem />
        <EuiFlexItem grow={false}>
          <EuiText size="s">
            <p>{message}</p>
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="s" />

      <div className="upgDeprecations">
        {Object.keys(groups)
          .sort()
          .map(groupName => [
            <EuiAccordion
              className="upgDeprecations__item"
              key={`acc-${groupName}`}
              id={`depgroup-${groupName}`}
              buttonContent={<span className="upgDeprecations__itemName">{groupName}</span>}
              extraAction={
                <div>
                  {currentGroupBy === GroupByOption.message &&
                    groups[groupName][0].index !== undefined && (
                      <Fragment>
                        <EuiBadge color="hollow">
                          {groups[groupName].filter(g => g.index).length} indices
                        </EuiBadge>
                        &emsp;
                      </Fragment>
                    )}
                  <DeprecationHealth
                    single={currentGroupBy === GroupByOption.message}
                    deprecations={groups[groupName]}
                  />
                </div>
              }
            >
              <DeprecationList deprecations={groups[groupName]} currentGroupBy={currentGroupBy} />
            </EuiAccordion>,
          ])}
      </div>
    </div>
  );
};
