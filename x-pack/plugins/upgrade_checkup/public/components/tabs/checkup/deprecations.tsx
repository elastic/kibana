/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { ReactNode, StatelessComponent } from 'react';

import {
  EuiAccordion,
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHealth,
  EuiIcon,
  EuiSpacer,
  EuiText,
  IconColor,
} from '@elastic/eui';

import {
  DeprecationInfo,
  MIGRATION_DEPRECATION_LEVEL as LEVEL,
} from 'src/core_plugins/elasticsearch';
import { EnrichedDeprecationInfo } from '../../../../server/lib/es_migration_apis';
import { IndexDeprecation, IndexDeprecationTable } from './index_table';
import { GroupByOption, LevelFilterOption } from './types';

// TODO: use TS enum?
const LEVEL_MAP = {
  none: 0,
  info: 1,
  warning: 2,
  critical: 3,
};
const REVERSE_LEVEL_MAP: { [idx: number]: LEVEL } = _.invert(LEVEL_MAP);
const COLOR_MAP: { [level: string]: IconColor } = {
  none: 'success',
  info: 'primary',
  warning: 'warning',
  critical: 'danger',
};
const ACTION_MAP: { [level: string]: string } = {
  info: 'No action required, but it is advised to read about the change.',
  warning: 'Resolving this issue is advised but not required to upgrade.',
  critical: 'This issue must be resolved to upgrade.',
};

const sortByLevelDesc = (a: DeprecationInfo, b: DeprecationInfo) => {
  return -1 * (LEVEL_MAP[a.level] - LEVEL_MAP[b.level]);
};

const filterDeps = (levels: Set<LevelFilterOption>) => (dep: DeprecationInfo) => {
  return levels.has(dep.level as LevelFilterOption);
};

interface DeprecationCellProps {
  headline?: string;
  healthColor?: string;
  docUrl: string;
  items: Array<{ title: string; body: string }>;
  children?: ReactNode;
}

const DeprecationCell: StatelessComponent<DeprecationCellProps> = ({
  headline,
  healthColor,
  docUrl,
  items,
  children,
}) => (
  <EuiFlexItem className="upgrade-checkup__deprecation-cell">
    <EuiFlexGroup alignItems="center">
      <EuiFlexItem grow>
        {headline && (
          <EuiText>
            <h4>
              {healthColor && <EuiIcon type="dot" color={healthColor} />} {headline}
            </h4>
          </EuiText>
        )}
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButton size="s" href={docUrl} target="_blank">
          Read Documentation
        </EuiButton>
      </EuiFlexItem>
    </EuiFlexGroup>

    {items.map(item => (
      <div key={item.title}>
        <EuiSpacer size="m" />
        <EuiText color="subdued">
          <h6>{item.title}</h6>
          <p>{item.body}</p>
        </EuiText>
      </div>
    ))}

    {children && (
      <div>
        <EuiSpacer size="m" />
        {children}
      </div>
    )}
  </EuiFlexItem>
);

const MessageDeprecation: StatelessComponent<{ deprecation: EnrichedDeprecationInfo }> = ({
  deprecation,
}) => {
  const items = [];

  if (deprecation.index) {
    items.push({ title: 'Index', body: deprecation.index });
  }

  const action = ACTION_MAP[deprecation.level];
  if (action) {
    items.push({ title: 'Action', body: action });
  }

  if (deprecation.details) {
    items.push({ title: 'Details', body: deprecation.details });
  }

  return (
    <DeprecationCell
      headline={deprecation.message}
      healthColor={COLOR_MAP[deprecation.level]}
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
  indices: IndexDeprecation[];
}

const IndexDeprecation: StatelessComponent<IndexDeprecationProps> = ({ deprecation, indices }) => {
  const items = [];

  const action = ACTION_MAP[deprecation.level];
  if (action) {
    items.push({ title: 'Action', body: action });
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

const DeprecationList: StatelessComponent<{
  deprecations: EnrichedDeprecationInfo[];
  currentGroupBy: GroupByOption;
}> = ({ deprecations, currentGroupBy }) => {
  if (currentGroupBy === GroupByOption.index) {
    return (
      <div>
        {deprecations.map(dep => (
          <MessageDeprecation deprecation={dep} key={dep.message} />
        ))}
      </div>
    );
  } else if (currentGroupBy === GroupByOption.message) {
    // If we're grouping by index we assume that every deprecation message is the same
    // issue and that each deprecation will have an index associated with it.
    const indices = deprecations.map(dep => ({ index: dep.index!, details: dep.details }));

    return <IndexDeprecation indices={indices} deprecation={deprecations[0]} />;
  } else {
    return null;
  }
};

const EmptyMessage: StatelessComponent = () => {
  return (
    <EuiText color="subdued">
      <p>No deprecations.</p>
    </EuiText>
  );
};

interface GroupedDeprecationsProps {
  currentFilter: Set<LevelFilterOption>;
  currentGroupBy: GroupByOption;
  deprecations?: EnrichedDeprecationInfo[];
}

export const GroupedDeprecations: StatelessComponent<GroupedDeprecationsProps> = ({
  currentGroupBy,
  deprecations,
  currentFilter,
}) => {
  if (!deprecations) {
    return <EmptyMessage />;
  }

  deprecations = deprecations.filter(filterDeps(currentFilter));
  if (deprecations.length === 0) {
    return <EmptyMessage />;
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
            extraAction={<DeprecationSummary deprecations={groups[groupName]} />}
          >
            <EuiSpacer />
            <DeprecationList deprecations={groups[groupName]} currentGroupBy={currentGroupBy} />
          </EuiAccordion>,
          <EuiSpacer key={`spc-${groupName}`} />,
        ])}
    </div>
  );
};

interface DeprecationSummaryProps {
  deprecations: DeprecationInfo[];
}

export const DeprecationSummary: StatelessComponent<DeprecationSummaryProps> = ({
  deprecations,
}) => {
  if (deprecations.length === 0) {
    return <EuiHealth color="success">No problems</EuiHealth>;
  }

  const levels = deprecations.map(d => LEVEL_MAP[d.level]);
  const highest = Math.max(...levels);
  const highestLevel = REVERSE_LEVEL_MAP[highest];
  const numHighest = deprecations.filter(d => d.level === highestLevel).length;
  const color = COLOR_MAP[highestLevel];

  return <EuiHealth color={color}>{`${numHighest} ${highestLevel}`}</EuiHealth>;
};
