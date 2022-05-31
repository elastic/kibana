/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
// eslint-disable-next-line @kbn/eslint/module_migration
import { MemoryRouterProps } from 'react-router';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { KubernetesSecurityRoutes } from '.';

jest.mock('../kubernetes_widget', () => ({
  KubernetesWidget: () => <div>{'Mock kubernetes widget'}</div>,
}));

const renderWithRouter = (
  initialEntries: MemoryRouterProps['initialEntries'] = ['/kubernetes']
) => {
  const useGlobalFullScreen = jest.fn();
  useGlobalFullScreen.mockImplementation(() => {
    return { globalFullScreen: false };
  });
  const useSourcererDataView = jest.fn();
  useSourcererDataView.mockImplementation(() => {
    return {
      indexPattern: {
        fields: [
          {
            aggregatable: false,
            esTypes: [],
            name: '_id',
            searchable: true,
            type: 'string',
          },
        ],
        title: '.mock-index-pattern',
      },
    };
  });
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <KubernetesSecurityRoutes filter={<div>{'Mock filters'}</div>} />
    </MemoryRouter>
  );
};

describe('Kubernetes security routes', () => {
  it('navigates to the kubernetes page', () => {
    renderWithRouter();
    expect(screen.getAllByText('Mock kubernetes widget')).toHaveLength(3);
  });
});
