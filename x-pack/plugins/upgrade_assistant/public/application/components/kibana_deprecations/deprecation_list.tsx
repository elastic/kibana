/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent, useState, useEffect } from 'react';
import { groupBy } from 'lodash';
import { EuiHorizontalRule, EuiSpacer } from '@elastic/eui';

import type { DomainDeprecationDetails } from 'kibana/public';

import { LevelFilterOption } from '../types';
import { SearchBar, DeprecationListBar, DeprecationPagination } from '../shared';
import { LEVEL_MAP, DEPRECATIONS_PER_PAGE } from '../constants';
import { KibanaDeprecationAccordion } from './deprecation_item';
import { StepsModalContent } from './steps_modal';
import { KibanaDeprecationErrors } from './kibana_deprecation_errors';

interface Props {
  deprecations: DomainDeprecationDetails[];
  showStepsModal: (newStepsModalContent: StepsModalContent) => void;
  showResolveModal: (deprecation: DomainDeprecationDetails) => void;
  reloadDeprecations: () => Promise<void>;
  isLoading: boolean;
}

const getFilteredDeprecations = (
  deprecations: DomainDeprecationDetails[],
  level: string,
  search: string
) => {
  return deprecations
    .filter((deprecation) => {
      return level === 'all' || deprecation.level === level;
    })
    .filter((filteredDep) => {
      if (search.length > 0) {
        try {
          const searchReg = new RegExp(search, 'i');
          return searchReg.test(filteredDep.message);
        } catch (e) {
          // ignore any regexp errors
          return true;
        }
      }
      return true;
    });
};

const sortByLevelDesc = (a: DomainDeprecationDetails, b: DomainDeprecationDetails) => {
  return -1 * (LEVEL_MAP[a.level] - LEVEL_MAP[b.level]);
};

export const KibanaDeprecationList: FunctionComponent<Props> = ({
  deprecations,
  showStepsModal,
  showResolveModal,
  reloadDeprecations,
  isLoading,
}) => {
  const [currentFilter, setCurrentFilter] = useState<LevelFilterOption>(LevelFilterOption.all);
  const [search, setSearch] = useState('');
  const [expandState, setExpandState] = useState({
    forceExpand: false,
    expandNumber: 0,
  });
  const [currentPage, setCurrentPage] = useState(0);

  const setExpandAll = (expandAll: boolean) => {
    setExpandState({ forceExpand: expandAll, expandNumber: expandState.expandNumber + 1 });
  };

  const levelGroups = groupBy(deprecations, 'level');
  const deprecationLevelsCount = Object.keys(levelGroups).reduce((counts, level) => {
    counts[level] = levelGroups[level].length;
    return counts;
  }, {} as { [level: string]: number });

  const filteredDeprecations = getFilteredDeprecations(deprecations, currentFilter, search);

  const deprecationsWithErrors = deprecations.filter((dep) => dep.level === 'fetch_error');

  useEffect(() => {
    const pageCount = Math.ceil(filteredDeprecations.length / DEPRECATIONS_PER_PAGE);
    if (currentPage >= pageCount) {
      setCurrentPage(0);
    }
  }, [filteredDeprecations, currentPage]);

  return (
    <>
      <SearchBar
        isLoading={isLoading}
        loadData={reloadDeprecations}
        currentFilter={currentFilter}
        onFilterChange={setCurrentFilter}
        onSearchChange={setSearch}
        totalDeprecationsCount={deprecations.length}
        deprecationLevelsCount={deprecationLevelsCount}
      />

      {deprecationsWithErrors.length > 0 && (
        <>
          <KibanaDeprecationErrors errorType="pluginError" />
          <EuiSpacer />
        </>
      )}

      <DeprecationListBar
        allDeprecationsCount={deprecations.length}
        filteredDeprecationsCount={filteredDeprecations.length}
        setExpandAll={setExpandAll}
      />

      <EuiHorizontalRule margin="m" />

      <>
        {filteredDeprecations
          .slice(currentPage * DEPRECATIONS_PER_PAGE, (currentPage + 1) * DEPRECATIONS_PER_PAGE)
          .sort(sortByLevelDesc)
          .map((deprecation, index) => [
            <div key={`kibana-deprecation-${index}`} data-test-subj="kibanaDeprecationItem">
              <KibanaDeprecationAccordion
                {...{
                  key: expandState.expandNumber,
                  index,
                  deprecation,
                  forceExpand: expandState.forceExpand,
                  showStepsModal,
                  showResolveModal,
                }}
              />
              <EuiHorizontalRule margin="s" />
            </div>,
          ])}

        {/* Only show pagination if we have more than DEPRECATIONS_PER_PAGE */}
        {filteredDeprecations.length > DEPRECATIONS_PER_PAGE && (
          <>
            <EuiSpacer />

            <DeprecationPagination
              pageCount={Math.ceil(filteredDeprecations.length / DEPRECATIONS_PER_PAGE)}
              activePage={currentPage}
              setPage={setCurrentPage}
            />
          </>
        )}
      </>
    </>
  );
};
