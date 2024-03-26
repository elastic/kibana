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
import { EuiPanel } from '@elastic/eui';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import React from 'react';
import { EuiPageTemplate, EuiSpacer } from '@elastic/eui';
import { css } from '@emotion/react';
import backgroundImageUrl from './header/background.svg';
import { Footer } from './footer/footer';
import { OnboardingFlowForm } from './onboarding_flow_form/onboarding_flow_form';
import { Header } from './header/header';

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
    <QueryClientProvider client={queryClient}>
      <EuiThemeProvider darkMode={false}>
        <>
          <EuiPageTemplate.Section
            paddingSize="xl"
            css={css`
              & > div {
                background-image: url(${backgroundImageUrl});
                background-position: right center;
                background-repeat: no-repeat;
              }
            `}
            grow={false}
            restrictWidth
          >
            <EuiSpacer size="xl" />
            <Header />
          </EuiPageTemplate.Section>
          <EuiPageTemplate.Section
            paddingSize="xl"
            color="subdued"
            restrictWidth
          >
            <OnboardingFlowForm />
            <EuiSpacer size="xl" />
            <OnboardingFlowPackageList />
          </EuiPageTemplate.Section>
          <EuiPageTemplate.Section paddingSize="xl" grow={false} restrictWidth>
            <Footer />
            <EuiSpacer size="xl" />
          </EuiPageTemplate.Section>
        </>
      </EuiThemeProvider>
    </QueryClientProvider>
  );
}
