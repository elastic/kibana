/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import userEvent from '@testing-library/user-event';
import { EventFiltersProcessDescendantIndicator } from './event_filters_process_descendant_indicator';
import type { AnyArtifact } from '../../types';
import type { AppContextTestRender } from '../../../../../common/mock/endpoint';
import { createAppRootMockRenderer } from '../../../../../common/mock/endpoint';
import {
  FILTER_PROCESS_DESCENDANTS_TAG,
  GLOBAL_ARTIFACT_TAG,
} from '../../../../../../common/endpoint/service/artifacts/constants';
import type { ArtifactEntryCardDecoratorProps } from '../../artifact_entry_card';

describe('EventFiltersProcessDescendantIndicator', () => {
  let appTestContext: AppContextTestRender;
  let renderResult: ReturnType<AppContextTestRender['render']>;
  let render: (
    props: ArtifactEntryCardDecoratorProps
  ) => ReturnType<AppContextTestRender['render']>;

  const getStandardEventFilter: () => AnyArtifact = () =>
    ({
      tags: [GLOBAL_ARTIFACT_TAG],
    } as Partial<AnyArtifact> as AnyArtifact);

  const getProcessDescendantEventFilter: () => AnyArtifact = () =>
    ({
      tags: [GLOBAL_ARTIFACT_TAG, FILTER_PROCESS_DESCENDANTS_TAG],
    } as Partial<AnyArtifact> as AnyArtifact);

  beforeEach(() => {
    appTestContext = createAppRootMockRenderer();
    render = (props) => {
      renderResult = appTestContext.render(
        <EventFiltersProcessDescendantIndicator data-test-subj="test" {...props} />
      );
      return renderResult;
    };
  });

  it('should not display anything if feature flag is disabled', () => {
    appTestContext.setExperimentalFlag({ filterProcessDescendantsForEventFiltersEnabled: false });

    render({ item: getProcessDescendantEventFilter() });

    expect(renderResult.queryByTestId('test-processDescendantIndication')).not.toBeInTheDocument();
  });

  it('should not display anything if Event Filter is not for process descendants', () => {
    appTestContext.setExperimentalFlag({ filterProcessDescendantsForEventFiltersEnabled: true });

    render({ item: getStandardEventFilter() });

    expect(renderResult.queryByTestId('test-processDescendantIndication')).not.toBeInTheDocument();
  });

  it('should display indication if Event Filter is for process descendants', () => {
    appTestContext.setExperimentalFlag({ filterProcessDescendantsForEventFiltersEnabled: true });

    render({ item: getProcessDescendantEventFilter() });

    expect(renderResult.getByTestId('test-processDescendantIndication')).toBeInTheDocument();
  });

  it('should mention additional `event.category is process` entry in tooltip', async () => {
    const prefix = 'test-processDescendantIndicationTooltip';
    appTestContext.setExperimentalFlag({ filterProcessDescendantsForEventFiltersEnabled: true });
    render({ item: getProcessDescendantEventFilter() });

    expect(renderResult.queryByTestId(`${prefix}-tooltipText`)).not.toBeInTheDocument();

    userEvent.hover(renderResult.getByTestId(`${prefix}-tooltipIcon`));
    expect(await renderResult.findByTestId(`${prefix}-tooltipText`)).toBeInTheDocument();
  });
});
