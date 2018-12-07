/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Dictionary, groupBy } from 'lodash';
import React, { Fragment, StatelessComponent } from 'react';

import {
  EuiAccordion,
  EuiBadge,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPagination,
  EuiSpacer,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

import { DeprecationInfo } from 'src/core_plugins/elasticsearch';
import { EnrichedDeprecationInfo } from '../../../../../server/lib/es_migration_apis';
import { GroupByOption, LevelFilterOption } from '../../../types';

import { DeprecationCountSummary } from './count_summary';
import { DeprecationHealth } from './health';
import { DeprecationList } from './list';

const filterDeps = (levels: Set<LevelFilterOption>, search: string) => {
  const conditions: Array<(dep: DeprecationInfo) => boolean> = [
    dep => levels.has(dep.level as LevelFilterOption),
  ];

  if (search.length > 0) {
    // Change everything to lower case for a case-insensitive comparison
    conditions.push(dep => {
      try {
        const searchReg = new RegExp(search.toLowerCase());
        return Boolean(
          dep.message.toLowerCase().match(searchReg) ||
            (dep.details && dep.details.match(searchReg))
        );
      } catch (e) {
        // ignore any regexp errors.
        return true;
      }
    });
  }

  // Return true if every condition function returns true (boolean AND)
  return (dep: DeprecationInfo) => conditions.map(c => c(dep)).every(t => t);
};

/**
 * A single accordion item for a grouped deprecation item.
 */
const DeprecationAccordion: StatelessComponent<{
  groups: Dictionary<EnrichedDeprecationInfo[]>;
  groupName: string;
  currentGroupBy: GroupByOption;
  forceExpand: boolean;
}> = ({ groups, groupName, currentGroupBy, forceExpand }) => {
  const hasIndices = Boolean(
    currentGroupBy === GroupByOption.message && groups[groupName].filter(g => g.index).length
  );
  const numIndices = hasIndices ? groups[groupName].filter(g => g.index).length : null;

  return (
    <EuiAccordion
      className="upgDeprecations__item"
      initialIsOpen={forceExpand}
      id={`depgroup-${groupName}`}
      buttonContent={<span className="upgDeprecations__itemName">{groupName}</span>}
      extraAction={
        <div>
          {hasIndices && (
            <Fragment>
              <EuiBadge color="hollow">
                {numIndices}{' '}
                <FormattedMessage
                  id="xpack.upgradeAssistant.nouns.index"
                  defaultMessage="{numIndices, plural, one {index} other {indices}}"
                  values={{ numIndices }}
                />
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
    </EuiAccordion>
  );
};

interface GroupedDeprecationsProps {
  currentFilter: Set<LevelFilterOption>;
  search: string;
  currentGroupBy: GroupByOption;
  allDeprecations?: EnrichedDeprecationInfo[];
}

interface GroupedDeprecationsState {
  forceExpand: true | false | null;
  expandNumber: number;
  currentPage: number;
}

const PER_PAGE = 25;

/**
 * Displays groups of deprecation messages in an accordion.
 */
export class GroupedDeprecations extends React.Component<
  GroupedDeprecationsProps,
  GroupedDeprecationsState
> {
  public state = {
    forceExpand: false,
    // `expandNumber` is used as workaround to force EuiAccordion to re-render by
    // incrementing this number (used as a key) when expand all or collapse all is clicked.
    expandNumber: 0,
    currentPage: 0,
  };

  public render() {
    const { currentGroupBy, allDeprecations = [], currentFilter, search } = this.props;
    const { forceExpand, expandNumber, currentPage } = this.state;

    const deprecations = allDeprecations.filter(filterDeps(currentFilter, search));
    const groups = groupBy(deprecations, currentGroupBy);

    return (
      <div>
        <EuiFlexGroup responsive={false} alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty flush="left" size="s" onClick={() => this.setExpand(true)}>
              <FormattedMessage
                id="xpack.upgradeAssistant.checkupTab.controls.expandAllButtonLabel"
                defaultMessage="Expand all"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty flush="left" size="s" onClick={() => this.setExpand(false)}>
              <FormattedMessage
                id="xpack.upgradeAssistant.checkupTab.controls.collapseAllButtonLabel"
                defaultMessage="Collapse all"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem />
          <EuiFlexItem grow={false}>
            <DeprecationCountSummary {...{ deprecations, allDeprecations }} />
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiSpacer size="s" />

        <div className="upgDeprecations">
          {Object.keys(groups)
            .sort()
            // Apply pagination
            .slice(currentPage * PER_PAGE, (currentPage + 1) * PER_PAGE)
            .map(groupName => [
              <DeprecationAccordion
                key={expandNumber}
                {...{ groups, groupName, currentGroupBy, forceExpand }}
              />,
            ])}

          {/* Only show pagination if we have more than the PER_PAGE const. */}
          {Object.keys(groups).length > PER_PAGE && (
            <Fragment>
              <EuiSpacer />

              <EuiFlexGroup justifyContent="spaceAround">
                <EuiFlexItem grow={false}>
                  <EuiPagination
                    pageCount={Math.ceil(Object.keys(groups).length / PER_PAGE)}
                    activePage={currentPage}
                    onPageClick={this.setPage}
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            </Fragment>
          )}
        </div>
      </div>
    );
  }

  private setExpand = (forceExpand: boolean) => {
    this.setState({ forceExpand, expandNumber: this.state.expandNumber + 1 });
  };

  private setPage = (currentPage: number) => this.setState({ currentPage });
}
