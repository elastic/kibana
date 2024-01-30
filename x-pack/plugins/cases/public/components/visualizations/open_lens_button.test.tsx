/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { set } from 'lodash';
import React from 'react';
import { screen } from '@testing-library/react';
import type { AppMockRenderer } from '../../common/mock';
import { createAppMockRenderer } from '../../common/mock';
import { OpenLensButton } from './open_lens_button';
import { lensVisualization } from './index.mock';
import userEvent from '@testing-library/user-event';

describe('OpenLensButton', () => {
  const props = {
    attachmentId: 'test',
    ...lensVisualization,
  };

  let appMockRender: AppMockRenderer;

  beforeEach(() => {
    jest.clearAllMocks();
    appMockRender = createAppMockRenderer();
    appMockRender.coreStart.lens.canUseEditor = () => true;
  });

  it('renders the button correctly', () => {
    const navigateToPrefilledEditor = jest.fn();
    appMockRender.coreStart.lens.navigateToPrefilledEditor = navigateToPrefilledEditor;
    // @ts-expect-error: props are correct
    appMockRender.render(<OpenLensButton {...props} />);

    expect(screen.getByText('Open visualization')).toBeInTheDocument();
  });

  it('calls navigateToPrefilledEditor correctly', () => {
    const navigateToPrefilledEditor = jest.fn();
    appMockRender.coreStart.lens.navigateToPrefilledEditor = navigateToPrefilledEditor;
    // @ts-expect-error: props are correct
    appMockRender.render(<OpenLensButton {...props} />);

    userEvent.click(screen.getByTestId('cases-open-in-visualization-btn'));

    expect(navigateToPrefilledEditor).toBeCalledWith(
      {
        id: props.attachmentId,
        ...lensVisualization,
      },
      { openInNewTab: true }
    );
  });

  it('returns null if the user does not have access to lens', () => {
    appMockRender.coreStart.lens.canUseEditor = () => false;
    // @ts-expect-error: props are correct
    appMockRender.render(<OpenLensButton {...props} />);

    expect(screen.queryByText('Open visualization')).not.toBeInTheDocument();
  });

  it('does not show the button if the query is an ESQL', () => {
    const esqlProps = {
      attachmentId: 'test',
      ...lensVisualization,
    };

    set(esqlProps, 'attributes.state.query', { esql: '' });

    // @ts-expect-error: props are correct
    appMockRender.render(<OpenLensButton {...esqlProps} />);

    expect(screen.queryByText('Open visualization')).not.toBeInTheDocument();
  });
});
