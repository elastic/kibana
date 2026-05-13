/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import { renderWithContext } from '../../../utils/test_helpers';
import { TraceWaterfallContext, type TraceWaterfallContextProps } from './trace_waterfall_context';
import { TraceWarning } from './trace_warning';
import { TraceDataState } from './use_trace_waterfall';

describe('TraceWarning', () => {
  it("doesn't render a warning for a complete trace", () => {
    renderWithContext(
      <TraceWaterfallContext.Provider
        value={{ traceState: TraceDataState.Full } as TraceWaterfallContextProps}
      >
        <TraceWarning>
          <div>Trace</div>
        </TraceWarning>
      </TraceWaterfallContext.Provider>
    );

    const warning = screen.queryByTestId('traceWarning');
    const trace = screen.queryByText('Trace');

    expect(warning).not.toBeInTheDocument();
    expect(trace).toBeInTheDocument();
  });

  it('renders a warning for a partial trace, and shows the trace', () => {
    renderWithContext(
      <TraceWaterfallContext.Provider
        value={{ traceState: TraceDataState.Partial } as TraceWaterfallContextProps}
      >
        <TraceWarning>
          <div>Trace</div>
        </TraceWarning>
      </TraceWaterfallContext.Provider>
    );

    const warning = screen.queryByTestId('traceWarning');
    const trace = screen.queryByText('Trace');

    expect(warning).toBeInTheDocument();
    expect(trace).toBeInTheDocument();
  });

  it('renders a warning for an empty trace, and does not show the trace', () => {
    renderWithContext(
      <TraceWaterfallContext.Provider
        value={{ traceState: TraceDataState.Empty } as TraceWaterfallContextProps}
      >
        <TraceWarning>
          <div>Trace</div>
        </TraceWarning>
      </TraceWaterfallContext.Provider>
    );

    const warning = screen.queryByTestId('traceWarning');
    const trace = screen.queryByText('Trace');

    expect(warning).toBeInTheDocument();
    expect(trace).not.toBeInTheDocument();
  });
});
