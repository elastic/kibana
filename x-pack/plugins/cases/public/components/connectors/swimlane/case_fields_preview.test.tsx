/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';

import { connector, swimlaneConnector } from '../mock';
import FieldsPreview from './case_fields_preview';
import type { AppMockRenderer } from '../../../common/mock';
import { createAppMockRenderer } from '../../../common/mock';

describe('Webhook fields: Preview', () => {
  const fields = { caseId: 'test' };
  let appMockRenderer: AppMockRenderer;

  beforeEach(() => {
    appMockRenderer = createAppMockRenderer();
    jest.clearAllMocks();
  });

  it('does not render any fields', () => {
    appMockRenderer.render(<FieldsPreview connector={connector} fields={fields} />);
    expect(screen.queryByTestId('card-list-item')).not.toBeInTheDocument();
  });

  it('shows the warning comment callout when mapping is invalid', () => {
    const invalidConnector = {
      ...swimlaneConnector,
      config: {
        ...swimlaneConnector.config,
        mappings: {},
      },
    };

    appMockRenderer.render(<FieldsPreview connector={invalidConnector} fields={fields} />);
    expect(screen.getByTestId('mapping-warning-callout')).toBeInTheDocument();
  });

  it('shows the warning comment callout when the connector is of type alerts', () => {
    const invalidConnector = {
      ...swimlaneConnector,
      config: {
        ...swimlaneConnector.config,
        connectorType: 'alerts',
      },
    };

    appMockRenderer.render(<FieldsPreview connector={invalidConnector} fields={fields} />);
    expect(screen.getByTestId('mapping-warning-callout')).toBeInTheDocument();
  });

  it('does not shows the warning comment callout when connector is configured properly', () => {
    appMockRenderer.render(<FieldsPreview connector={swimlaneConnector} fields={fields} />);
    expect(screen.queryByTestId('mapping-warning-callout')).not.toBeInTheDocument();
  });
});
