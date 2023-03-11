/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { screen } from '@testing-library/react';

export const expectIdsInDoc = ({ be = [], notToBe = [] }: { be: string[]; notToBe?: string[] }) => {
  be.forEach((testId) => {
    expect(screen.getByTestId(testId)).toBeInTheDocument();
  });
  notToBe.forEach((testId) => {
    expect(screen.queryByTestId(testId)).not.toBeInTheDocument();
  });
};
