/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { render } from '@testing-library/react';
import { TestProviders } from '../../../mock';
import type { RiskEntity } from './risk_summary';
import * as i18n from './translations';
import { RiskSummary } from './risk_summary';
import { RiskScoreEntity, RiskSeverity } from '../../../../../common/search_strategy';
import { getEmptyValue } from '../../empty_value';

describe.each([RiskScoreEntity.host, RiskScoreEntity.user])(
  'RiskSummary entityType: %s',
  (riskEntity) => {
    it(`renders ${riskEntity} risk data`, () => {
      const riskSeverity = RiskSeverity.low;
      const risk = {
        loading: false,
        isModuleEnabled: true,
        result: [
          {
            '@timestamp': '1641902481',
            [riskEntity === RiskScoreEntity.host ? 'host' : 'user']: {
              name: 'test-host-name',
              risk: {
                multipliers: [],
                calculated_score_norm: 9999,
                calculated_level: riskSeverity,
                rule_risks: [],
              },
            },
          },
        ], // as unknown as HostRiskScore[] | UserRiskScore[],
      } as unknown as RiskEntity['risk'];

      const props = {
        riskEntity,
        risk,
      } as RiskEntity;

      const { getByText } = render(
        <TestProviders>
          <RiskSummary {...props} />
        </TestProviders>
      );

      expect(getByText(riskSeverity)).toBeInTheDocument();
      expect(getByText(i18n.RISK_DATA_TITLE(riskEntity))).toBeInTheDocument();
    });

    it('renders spinner when loading', () => {
      const risk = {
        loading: true,
        isModuleEnabled: true,
        result: [],
      };

      const props = {
        riskEntity,
        risk,
      } as RiskEntity;
      const { getByTestId } = render(
        <TestProviders>
          <RiskSummary {...props} />
        </TestProviders>
      );

      expect(getByTestId('loading')).toBeInTheDocument();
    });

    it(`renders empty value when there is no ${riskEntity} data`, () => {
      const risk = {
        loading: false,
        isModuleEnabled: true,
        result: [],
      };
      const props = {
        riskEntity,
        risk,
      } as RiskEntity;
      const { getByText } = render(
        <TestProviders>
          <RiskSummary {...props} />
        </TestProviders>
      );

      expect(getByText(getEmptyValue())).toBeInTheDocument();
    });
  }
);
