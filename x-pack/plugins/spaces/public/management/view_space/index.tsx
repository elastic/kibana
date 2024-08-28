/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { ComponentProps, PropsWithChildren } from 'react';

import { ViewSpaceProvider, type ViewSpaceProviderProps } from './provider';
import { ViewSpace } from './view_space';

type ViewSpacePageProps = ComponentProps<typeof ViewSpace> & ViewSpaceProviderProps;

export function ViewSpacePage({
  spaceId,
  getFeatures,
  history,
  onLoadSpace,
  selectedTabId,
  allowFeatureVisibility,
  allowSolutionVisibility,
  children,
  ...viewSpaceServicesProps
}: PropsWithChildren<ViewSpacePageProps>) {
  return (
    <ViewSpaceProvider {...viewSpaceServicesProps}>
      <ViewSpace
        spaceId={spaceId}
        getFeatures={getFeatures}
        history={history}
        onLoadSpace={onLoadSpace}
        selectedTabId={selectedTabId}
        allowFeatureVisibility={allowFeatureVisibility}
        allowSolutionVisibility={allowSolutionVisibility}
      />
    </ViewSpaceProvider>
  );
}
