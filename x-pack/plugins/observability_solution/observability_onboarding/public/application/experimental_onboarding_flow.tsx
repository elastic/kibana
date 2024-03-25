/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  PackageListGrid,
  useAvailablePackages,
} from '@kbn/fleet-plugin/public';
import { EuiThemeProvider } from '@kbn/kibana-react-plugin/common';
import { i18n } from '@kbn/i18n';
import { EuiPanel } from '@elastic/eui';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import React from 'react';

const queryClient = new QueryClient();

interface Props {
  selectedCategory?: string;
}

function OnboardingFlowPackageList({
  selectedCategory = 'observability',
}: Props) {
  const availablePackages = useAvailablePackages({
    prereleaseIntegrationsEnabled: false,
  });
  return (
    <EuiPanel>
      <PackageListGrid
        list={availablePackages.filteredCards.filter((card) =>
          card.categories.includes(selectedCategory)
        )}
        searchTerm={''}
        setSearchTerm={() => {}}
        selectedCategory={selectedCategory}
        setCategory={() => {}}
        categories={[]}
        setUrlandReplaceHistory={() => {}}
        setUrlandPushHistory={() => {}}
        showSearchTools={false}
      />
    </EuiPanel>
  );
}

export function ExperimentalOnboardingFlow() {
  return (
    <div>
      <QueryClientProvider client={queryClient}>
        <EuiThemeProvider darkMode={false}>
          <OnboardingFlowPackageList />
          {i18n.translate(
            'xpack.observability_onboarding.experimentalOnboardingFlow.experimentalOnboardingFlowLabel',
            { defaultMessage: 'Experimental onboarding flow' }
          )}
        </EuiThemeProvider>
      </QueryClientProvider>
    </div>
  );
}
