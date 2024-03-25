/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect } from 'react';
import type { DataView } from '@kbn/data-views-plugin/common';
import { render, screen } from '@testing-library/react';
import { withDataView } from '.';
import { useGetScopedSourcererDataView } from '../sourcerer/use_get_sourcerer_data_view';

interface TestComponentProps {
  dataView: DataView;
}

jest.mock('../sourcerer/use_get_sourcerer_data_view');

const TEST_ID = {
  DATA_VIEW_ERROR_COMPONENT: 'dataViewErrorComponent',
  TEST_COMPONENT: 'test_component',
  FALLBACK_COMPONENT: 'fallback_component',
};

const FallbackComponent: React.FC = () => <div data-test-subj={TEST_ID.FALLBACK_COMPONENT} />;

const dataViewMockFn = jest.fn();

const TestComponent = (props: TestComponentProps) => {
  useEffect(() => {
    dataViewMockFn(props.dataView);
  }, [props.dataView]);
  return <div data-test-subj={TEST_ID.TEST_COMPONENT} />;
};

describe('withDataViewId', () => {
  beforeEach(() => {
    (useGetScopedSourcererDataView as jest.Mock).mockReturnValue(undefined);
  });
  it('should render default error components when there is not fallback provided and dataViewId is null', async () => {
    const RenderedComponent = withDataView(TestComponent);
    render(<RenderedComponent />);
    expect(screen.getByTestId(TEST_ID.DATA_VIEW_ERROR_COMPONENT)).toBeVisible();
  });
  it('should render provided fallback and dataViewId is null', async () => {
    const RenderedComponent = withDataView(TestComponent, <FallbackComponent />);
    render(<RenderedComponent />);
    expect(screen.getByTestId(TEST_ID.FALLBACK_COMPONENT)).toBeVisible();
  });
  it('should render provided component when dataViewId is not null', async () => {
    (useGetScopedSourcererDataView as jest.Mock).mockReturnValue({ id: 'test' });
    const RenderedComponent = withDataView(TestComponent);
    render(<RenderedComponent />);
    expect(screen.getByTestId(TEST_ID.TEST_COMPONENT)).toBeVisible();
    expect(dataViewMockFn).toHaveBeenCalledWith({ id: 'test' });
  });
});
