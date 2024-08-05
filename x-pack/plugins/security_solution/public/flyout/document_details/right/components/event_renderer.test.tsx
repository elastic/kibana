/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { EventRenderer } from './event_renderer';
import { DocumentDetailsContext } from '../../shared/context';
import { EVENT_RENDERER_TEST_ID } from './test_ids';
import { mockContextValue } from '../../shared/mocks/mock_context';
import { mockDataAsNestedObject } from '../../shared/mocks/mock_data_as_nested_object';
import { TestProviders } from '../../../../common/mock';

const renderEventRenderer = (contextValue: DocumentDetailsContext) =>
  render(
    <DocumentDetailsContext.Provider value={contextValue}>
      <EventRenderer />
    </DocumentDetailsContext.Provider>,
    { wrapper: TestProviders }
  );

describe('<EventRenderer />', () => {
  it('should render conponent', async () => {
    const contextValue = {
      ...mockContextValue,
      dataAsNestedObject: {
        ...mockDataAsNestedObject,
        // using suricate because it's the simpliest to set up, for more details on how the event renderes are evaluated
        // see security_solutions/public/timelines/components/timeline/body/renderers/get_row_renderer.ts
        event: { ...mockDataAsNestedObject.event, module: ['suricata'] },
      },
    };
    const { getByTestId } = renderEventRenderer(contextValue);
    expect(getByTestId(EVENT_RENDERER_TEST_ID)).toBeInTheDocument();
  });

  it('should render empty component if event renderer is not available', async () => {
    const { container } = renderEventRenderer({} as unknown as DocumentDetailsContext);

    expect(container).toBeEmptyDOMElement();
  });
});
