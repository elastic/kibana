/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import type { SearchFilterConfig, FieldValueOptionType, EuiSearchBarProps } from '@elastic/eui';
import {
  EuiCard,
  EuiIcon,
  EuiFlexGrid,
  EuiFlexItem,
  EuiFormRow,
  EuiSearchBar,
  EuiSpacer,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { usePageUrlState, type PageUrlState } from '@kbn/ml-url-state';
import useMountedState from 'react-use/lib/useMountedState';
import useMount from 'react-use/lib/useMount';
import { isPopulatedObject } from '@kbn/ml-is-populated-object';
import { useMlKibana } from '../contexts/kibana';
import type { Module } from '../../../common/types/modules';
import { ML_PAGES } from '../../../common/constants/locator';
import { LoadingIndicator } from '../components/loading_indicator';
import { filterModules } from './utils';
import { SuppliedConfigurationsFlyout } from './supplied_configurations_flyout';

interface SuppliedConfigurationsPageUrlState {
  queryText: string;
}

export function isLogoObject(arg: unknown): arg is { icon: string } {
  return isPopulatedObject(arg) && Object.hasOwn(arg, 'icon');
}

export const SuppliedConfigurations = () => {
  const {
    services: {
      mlServices: {
        mlApi: { getDataRecognizerModule },
      },
    },
  } = useMlKibana();

  const [suppliedConfigurationsPageState, setSuppliedConfigurationsPageState] =
    usePageUrlState<PageUrlState>(ML_PAGES.SUPPLIED_CONFIGURATIONS, {
      queryText: '',
    });

  const [modules, setModules] = useState<Module[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [searchError, setSearchError] = useState<string | undefined>();
  const [isFlyoutVisible, setIsFlyoutVisible] = useState<boolean>(false);
  const [selectedModuleId, setSelectedModuleId] = useState<string | undefined>();

  const closeFlyout = () => setIsFlyoutVisible(false);
  const isMounted = useMountedState();

  /**
   * Loads recognizer module configuration.
   */
  const loadModules = useCallback(async () => {
    setIsLoading(true);
    try {
      const modulesReponse = (await getDataRecognizerModule()) as Module[];
      if (isMounted()) {
        setModules(modulesReponse);
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e);
    }
    setIsLoading(false);
  }, [getDataRecognizerModule, isMounted]);

  useMount(loadModules);

  const filters: SearchFilterConfig[] = useMemo(() => {
    const options: FieldValueOptionType[] = [];
    const tags = new Set(modules.map((module) => module.tags).flat());
    tags.forEach((tag) => {
      if (tag === undefined) return;
      options.push({
        value: tag,
        view: tag,
      });
    });

    return [
      {
        type: 'field_value_selection',
        field: 'tags',
        name: 'Tags',
        filterWith: 'includes',
        multiSelect: 'or',
        options,
      },
    ];
  }, [modules]);

  const schema = useMemo(
    () => ({
      strict: true,
      fields: {
        tags: {
          type: 'string',
        },
      },
    }),
    []
  );

  const setSearchQueryText = useCallback(
    (value: string) => {
      setSuppliedConfigurationsPageState({ queryText: value });
    },
    [setSuppliedConfigurationsPageState]
  );

  const query = useMemo(() => {
    const searchQueryText = (suppliedConfigurationsPageState as SuppliedConfigurationsPageUrlState)
      .queryText;
    return searchQueryText !== '' ? EuiSearchBar.Query.parse(searchQueryText) : undefined;
  }, [suppliedConfigurationsPageState]);

  const onChange: EuiSearchBarProps['onChange'] = (search) => {
    if (search.error !== null) {
      setSearchError(search.error.message);
      return;
    }

    setSearchError(undefined);
    setSearchQueryText(search.queryText);
  };

  const filteredModules = useMemo(() => {
    const clauses = query?.ast?.clauses ?? [];
    return clauses.length > 0 ? filterModules(modules, clauses) : modules;
  }, [query, modules]);

  if (isLoading === true) return <LoadingIndicator />;

  return (
    <>
      <EuiSearchBar
        defaultQuery={query}
        box={{
          placeholder: i18n.translate(
            'xpack.ml.anomalyDetection.suppliedConfigurationsPage.searchBarPlaceholder',
            {
              defaultMessage: 'Search supplied configurations',
            }
          ),
          incremental: true,
          schema,
        }}
        filters={filters}
        onChange={onChange}
      />
      <EuiFormRow
        data-test-subj="mlAnomalyJobSelectionControls"
        isInvalid={searchError !== undefined}
        error={searchError}
      >
        <></>
      </EuiFormRow>
      <EuiSpacer size="l" />
      <EuiFlexGrid gutterSize="l" columns={4}>
        {filteredModules.map(({ description, id, logo, title }) => {
          return (
            <EuiFlexItem key={id} data-test-subj="mlSuppliedConfigurationsCard">
              <EuiCard
                data-test-subj={`mlSuppliedConfigurationsCard ${id}`}
                layout="horizontal"
                icon={isLogoObject(logo) ? <EuiIcon size="xxl" type={logo.icon} /> : null}
                title={title}
                description={description}
                onClick={() => {
                  setIsFlyoutVisible(true);
                  setSelectedModuleId(id);
                }}
              />
            </EuiFlexItem>
          );
        })}
      </EuiFlexGrid>
      {isFlyoutVisible && selectedModuleId ? (
        <SuppliedConfigurationsFlyout
          module={modules.find(({ id }) => id === selectedModuleId) as Module}
          onClose={closeFlyout}
        />
      ) : null}
    </>
  );
};
