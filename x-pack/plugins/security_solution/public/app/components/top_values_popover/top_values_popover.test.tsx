/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import React from 'react';
import { TestProviders } from '../../../common/mock';
import { TopValuesPopover } from './top_values_popover';

jest.mock('../../../common/components/visualization_actions/lens_embeddable');
jest.mock('react-router-dom', () => {
  const original = jest.requireActual('react-router-dom');
  return {
    ...original,
    useLocation: jest.fn().mockReturnValue({ pathname: '/test' }),
  };
});

const element = document.createElement('button');
document.body.appendChild(element);

const data = {
  fieldName: 'user.name',
  nodeRef: element,
};

const mockUseObservable = jest.fn();

jest.mock('react-use/lib/useObservable', () => () => mockUseObservable());

jest.mock('../../../common/lib/kibana', () => {
  const original = jest.requireActual('../../../common/lib/kibana');
  return {
    ...original,
    useKibana: () => ({
      ...original.useKibana(),
      services: {
        ...original.useKibana().services,
        topValuesPopover: { getObservable: jest.fn() },
      },
    }),
  };
});

describe('TopNAction', () => {
  it('renders', async () => {
    mockUseObservable.mockReturnValue(data);

    const { queryByTestId } = render(<TopValuesPopover />, {
      wrapper: TestProviders,
    });

    expect(queryByTestId('topN-container')).toBeInTheDocument();
  });

  it('does not render when nodeRef is null', () => {
    mockUseObservable.mockReturnValue({ ...data, nodeRef: undefined });

    const { queryByTestId } = render(<TopValuesPopover />, {
      wrapper: TestProviders,
    });

    expect(queryByTestId('topN-container')).not.toBeInTheDocument();
  });

  it('does not render when data is undefined', () => {
    mockUseObservable.mockReturnValue(undefined);

    const { queryByTestId } = render(<TopValuesPopover />, {
      wrapper: TestProviders,
    });

    expect(queryByTestId('topN-container')).not.toBeInTheDocument();
  });
});
