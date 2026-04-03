/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ComponentType } from 'react';
import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import type { ApmPluginContextValue } from '../../../../context/apm_plugin/apm_plugin_context';
import { FETCH_STATUS } from '../../../../hooks/use_fetcher';
import { MockApmPluginStorybook } from '../../../../context/apm_plugin/mock_apm_plugin_storybook';
import { ApmIndexSettingsContext } from '../../../../context/apm_index_settings/apm_index_settings_context';
import { OpenInDiscover } from './open_in_discover';

const mockIndexSettingsContext = {
  indexSettings: [
    {
      configurationName: 'transaction' as const,
      defaultValue: 'traces-apm-*',
      savedValue: undefined,
    },
    {
      configurationName: 'span' as const,
      defaultValue: 'traces-apm-*',
      savedValue: undefined,
    },
    {
      configurationName: 'error' as const,
      defaultValue: 'logs-apm.error-*',
      savedValue: undefined,
    },
  ],
  indexSettingsStatus: FETCH_STATUS.SUCCESS,
};

const defaultQueryParams = {
  serviceName: 'my-service',
  transactionType: 'request',
  sortDirection: 'DESC' as const,
};

const mockApmContext = {
  share: {
    url: {
      locators: {
        get: () => ({
          getRedirectUrl: () => 'http://test-discover-url',
        }),
      },
    },
  },
} as unknown as ApmPluginContextValue;

export default {
  title: 'shared/links/OpenInDiscover',
  component: OpenInDiscover,
  decorators: [
    (Story: ComponentType) => (
      <MockApmPluginStorybook apmContext={mockApmContext}>
        <ApmIndexSettingsContext.Provider value={mockIndexSettingsContext}>
          <Story />
        </ApmIndexSettingsContext.Provider>
      </MockApmPluginStorybook>
    ),
  ],
};

export function AllVariants() {
  const variants = ['button', 'emptyButton', 'iconButton', 'link'] as const;

  return (
    <EuiFlexGroup direction="column" gutterSize="l">
      {variants.map((variant) => (
        <EuiFlexItem key={variant} grow={false}>
          <EuiFlexGroup alignItems="center" gutterSize="m">
            <EuiFlexItem grow={false} style={{ width: 120 }}>
              <EuiText size="s">
                <code>{variant}</code>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <OpenInDiscover
                variant={variant}
                dataTestSubj={`story-${variant}`}
                label="Open in Discover"
                indexType="traces"
                rangeFrom="now-15m"
                rangeTo="now"
                queryParams={defaultQueryParams}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
}

export function Button() {
  return (
    <OpenInDiscover
      variant="button"
      dataTestSubj="story-button"
      label="Open in Discover"
      indexType="traces"
      rangeFrom="now-15m"
      rangeTo="now"
      queryParams={defaultQueryParams}
    />
  );
}

export function EmptyButton() {
  return (
    <OpenInDiscover
      variant="emptyButton"
      dataTestSubj="story-emptyButton"
      label="Open in Discover"
      indexType="traces"
      rangeFrom="now-15m"
      rangeTo="now"
      queryParams={defaultQueryParams}
    />
  );
}

export function IconButton() {
  return (
    <OpenInDiscover
      variant="iconButton"
      dataTestSubj="story-iconButton"
      label="Open traces in Discover"
      indexType="traces"
      rangeFrom="now-15m"
      rangeTo="now"
      queryParams={defaultQueryParams}
    />
  );
}

export function Link() {
  return (
    <OpenInDiscover
      variant="link"
      dataTestSubj="story-link"
      label="Open in Discover"
      indexType="traces"
      rangeFrom="now-15m"
      rangeTo="now"
      queryParams={defaultQueryParams}
    />
  );
}

export function CustomLabel() {
  return (
    <OpenInDiscover
      variant="emptyButton"
      dataTestSubj="story-custom-label"
      label="Open error group in Discover"
      indexType="error"
      rangeFrom="now-15m"
      rangeTo="now"
      queryParams={{ serviceName: 'my-service', errorGroupId: 'abc123', sortDirection: 'DESC' }}
    />
  );
}

export function Loading() {
  return (
    <ApmIndexSettingsContext.Provider
      value={{
        indexSettings: [],
        indexSettingsStatus: FETCH_STATUS.LOADING,
      }}
    >
      <EuiFlexGroup direction="column" gutterSize="l">
        <EuiFlexItem grow={false}>
          <OpenInDiscover
            variant="button"
            dataTestSubj="story-loading-button"
            label="Open in Discover"
            indexType="traces"
            rangeFrom="now-15m"
            rangeTo="now"
            queryParams={defaultQueryParams}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <OpenInDiscover
            variant="emptyButton"
            dataTestSubj="story-loading-emptyButton"
            label="Open in Discover"
            indexType="traces"
            rangeFrom="now-15m"
            rangeTo="now"
            queryParams={defaultQueryParams}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <OpenInDiscover
            variant="iconButton"
            dataTestSubj="story-loading-iconButton"
            label="Open in Discover"
            indexType="traces"
            rangeFrom="now-15m"
            rangeTo="now"
            queryParams={defaultQueryParams}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </ApmIndexSettingsContext.Provider>
  );
}

export function Disabled() {
  return (
    <ApmIndexSettingsContext.Provider
      value={{
        indexSettings: [],
        indexSettingsStatus: FETCH_STATUS.SUCCESS,
      }}
    >
      <EuiFlexGroup direction="column" gutterSize="l">
        <EuiFlexItem grow={false}>
          <OpenInDiscover
            variant="button"
            dataTestSubj="story-disabled-button"
            label="Open in Discover"
            indexType="traces"
            rangeFrom="now-15m"
            rangeTo="now"
            queryParams={defaultQueryParams}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <OpenInDiscover
            variant="link"
            dataTestSubj="story-disabled-link"
            label="Open in Discover"
            indexType="traces"
            rangeFrom="now-15m"
            rangeTo="now"
            queryParams={defaultQueryParams}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </ApmIndexSettingsContext.Provider>
  );
}
