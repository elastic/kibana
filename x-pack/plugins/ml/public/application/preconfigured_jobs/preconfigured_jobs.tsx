/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { EuiSearchBarOnChangeArgs, SearchFilterConfig } from '@elastic/eui';
import {
  EuiCallOut,
  EuiCard,
  EuiIcon,
  EuiFlexGrid,
  EuiFlexItem,
  EuiSearchBar,
  EuiSpacer,
} from '@elastic/eui';
import { isPopulatedObject } from '@kbn/ml-is-populated-object';
import { useMlKibana } from '../contexts/kibana';
import type { Module } from '../../../common/types/modules';
import { LoadingIndicator } from '../components/loading_indicator';
import { filterModules } from './utils';
import { PreconfiguredJobsFlyout } from './preconfigured_jobs_flyout';

const TAGS = ['observability', 'logs', 'security'];

export function isLogoObject(arg: unknown): arg is { icon: string } {
  return isPopulatedObject(arg) && Object.hasOwn(arg, 'icon');
}

export const PreconfiguredJobs = () => {
  const {
    services: {
      mlServices: {
        mlApiServices: { getDataRecognizerModule },
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

  /**
   * Loads recognizer module configuration.
   */
  const loadModules = useCallback(async () => {
    setIsLoading(true);
    try {
      const modulesReponse = (await getDataRecognizerModule()) as Module[];
      setModules(modulesReponse);
      setIsLoading(false);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e);
      setIsLoading(false);
    }
  }, [getDataRecognizerModule]);

  useEffect(() => {
    loadModules();
  }, [loadModules]);

  const filters: SearchFilterConfig[] = useMemo(
    () => [
      {
        type: 'field_value_selection',
        field: 'tags',
        name: 'Tags',
        filterWith: 'includes',
        multiSelect: 'or',
        options: TAGS.map((tag) => {
          return {
            value: tag,
            view: tag,
          };
        }),
      },
    ],
    []
  );

  const schema = {
    strict: true,
    fields: {
      tags: {
        type: 'string',
        validate: (value: string) => {
          if (!TAGS.some((tag) => tag === value)) {
            throw new Error(`unknown tag (possible values: ${TAGS.map((tag) => tag)})`);
          }
        },
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
          placeholder: 'Search preconfigured jobs',
          incremental: true,
          schema,
        }}
        filters={filters}
        onChange={onChange}
      />
      <EuiSpacer size="l" />
      <EuiFlexGrid gutterSize="l" columns={3}>
        {filteredModules.map(({ description, id, logo, title }) => {
          return (
            <EuiFlexItem key={id}>
              <EuiCard
                layout="horizontal"
                icon={<EuiIcon size="xxl" type={isLogoObject(logo) ? logo.icon : logo} />}
                title={title}
                // isDisabled={false}
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
        <PreconfiguredJobsFlyout
          module={modules.find(({ id }) => id === selectedModuleId) as Module}
          onClose={closeFlyout}
        />
      ) : null}
    </>
  );
};
