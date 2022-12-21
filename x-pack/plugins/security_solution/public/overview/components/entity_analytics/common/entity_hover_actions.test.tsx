/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import React from 'react';
import { useKibana as mockUseKibana } from '../../../../common/lib/kibana/__mocks__';
import { TestProviders } from '../../../../common/mock';
import { EntityAnalyticsHoverActions } from './entity_hover_actions';

const mockedUseKibana = mockUseKibana();

jest.mock('../../../../common/lib/kibana', () => {
  const original = jest.requireActual('../../../../common/lib/kibana');
  return {
    ...original,
    useKibana: () => mockedUseKibana,
  };
});

describe('EntityAnalyticsHoverActions', () => {
  it('it renders "add to timeline" and "copy" hover action', () => {
    const { getByTestId } = render(
      <EntityAnalyticsHoverActions
        idPrefix={`my-test-field`}
        fieldName={'test.field'}
        fieldValue={'testValue'}
      />,
      { wrapper: TestProviders }
    );

    expect(getByTestId('test-add-to-timeline')).toBeInTheDocument();
    expect(getByTestId('test-copy-button')).toBeInTheDocument();
  });
});
