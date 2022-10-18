/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, fireEvent } from '@testing-library/react';
import React from 'react';
import { RiskInformationButtonEmpty, RiskInformationButtonIcon } from '.';
import { TestProviders } from '../../../../common/mock';
import { RiskScoreEntity } from '../../../../../common/search_strategy';

describe.each([RiskScoreEntity.host, RiskScoreEntity.user])(
  'Risk Information entityType: %s',
  (riskEntity) => {
    describe.each(['RiskInformationButtonIcon', 'RiskInformationButtonEmpty'])(
      `%s component`,
      (componentType) => {
        const Component =
          componentType === 'RiskInformationButtonIcon'
            ? RiskInformationButtonIcon
            : RiskInformationButtonEmpty;

        it('renders', () => {
          const { queryByTestId } = render(<Component riskEntity={riskEntity} />);

          expect(queryByTestId('open-risk-information-flyout-trigger')).toBeInTheDocument();
        });

        it('opens and displays table with 5 rows', () => {
          const NUMBER_OF_ROWS = 1 + 5; // 1 header row + 5 severity rows
          const { getByTestId, queryByTestId, queryAllByRole } = render(
            <TestProviders>
              <Component riskEntity={riskEntity} />
            </TestProviders>
          );

          fireEvent.click(getByTestId('open-risk-information-flyout-trigger'));

          expect(queryByTestId('risk-information-table')).toBeInTheDocument();
          expect(queryAllByRole('row')).toHaveLength(NUMBER_OF_ROWS);
        });
      }
    );
  }
);
