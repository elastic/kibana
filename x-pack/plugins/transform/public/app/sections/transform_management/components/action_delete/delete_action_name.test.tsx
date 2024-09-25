/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';

import type { DeleteActionNameProps } from './delete_action_name';
import { DeleteActionName } from './delete_action_name';

jest.mock('../../../../app_dependencies');

describe('Transform: Transform List Actions <DeleteAction />', () => {
  test('Minimal initialization', () => {
    const props: DeleteActionNameProps = {
      items: [],
      canDeleteTransform: true,
      disabled: false,
      isBulkAction: false,
      forceDisable: false,
    };

    const { container } = render(<DeleteActionName {...props} />);
    expect(container.textContent).toBe('Delete');
  });
});
