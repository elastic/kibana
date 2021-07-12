/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '../../lib/helper/rtl_helpers';
import * as T from './step_detail_page';

describe('StepDetailPageHeader component', () => {
  it('displays step name', () => {
    // @ts-expect-error partial state
    jest.spyOn(T, 'useStepDetailPage').mockReturnValue(() => ({
      activeStep: {
        synthetics: {
          step: {
            name: 'step-name',
          },
        },
      },
      journey: {},
    }));
    const { getByText } = render(<T.StepDetailPageHeader />);
    getByText('not exist');
  });
});
