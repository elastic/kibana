/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import type {
  EuiSearchBarOnChangeArgs,
  SearchFilterConfig,
  FieldValueOptionType,
} from '@elastic/eui';
import {
  EuiCallOut,
  EuiCard,
  EuiIcon,
  EuiFlexGrid,
  EuiFlexItem,
  EuiSearchBar,
  EuiSpacer,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import useMountedState from 'react-use/lib/useMountedState';
import useMount from 'react-use/lib/useMount';
import { isPopulatedObject } from '@kbn/ml-is-populated-object';
import { useMlKibana } from '../contexts/kibana';
import type { Module } from '../../../common/types/modules';
import { LoadingIndicator } from '../components/loading_indicator';
import { filterModules } from './utils';
import { SuppliedConfigurationsFlyout } from './supplied_configurations_flyout';

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

  const [modules, setModules] = useState<Module[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [query, setQuery] = useState(EuiSearchBar.Query.MATCH_ALL);
  const [error, setError] = useState<EuiSearchBarOnChangeArgs['error'] | null>(null);
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

  const schema = {
    strict: true,
    fields: {
      tags: {
        type: 'string',
      },
    },
  };

  const filteredModules = useMemo(() => {
    const clauses = query?.ast?.clauses ?? [];
    return clauses.length > 0 ? filterModules(modules, clauses) : modules;
  }, [query, modules]);

  const onChange = ({ query: onChangeQuery, error: onChangeError }: EuiSearchBarOnChangeArgs) => {
    if (onChangeError) {
      setError(error);
    } else {
      setError(null);
      setQuery(onChangeQuery);
    }
  };

  if (isLoading === true) return <LoadingIndicator />;

  return error ? (
    <>
      <EuiCallOut iconType="faceSad" color="danger" title={`Invalid search: ${error?.message}`} />
      <EuiSpacer size="l" />
    </>
  ) : (
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
