/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import { ML_ANOMALY_SEVERITY } from '@kbn/ml-anomaly-utils/anomaly_severity';
import { AnomalySeverityIcon, getAnomalySeverityIconType } from './anomaly_severity_icon';

describe('anomaly severity icons', () => {
  describe('getAnomalySeverityIconType', () => {
    it('maps severities to the expected icon types', () => {
      expect(getAnomalySeverityIconType(ML_ANOMALY_SEVERITY.LOW).iconType).toBe('info');
      expect(getAnomalySeverityIconType(ML_ANOMALY_SEVERITY.WARNING).iconType).toBe(
        'chevronSingleUp'
      );
      expect(getAnomalySeverityIconType(ML_ANOMALY_SEVERITY.MINOR).iconType).toBe(
        'chevronDoubleRight'
      );
      expect(getAnomalySeverityIconType(ML_ANOMALY_SEVERITY.MAJOR).iconType).toBe('warning');
      expect(getAnomalySeverityIconType(ML_ANOMALY_SEVERITY.CRITICAL).iconType).toBe('crossCircle');
    });

    it('includes rotation css for minor severity', () => {
      expect(getAnomalySeverityIconType(ML_ANOMALY_SEVERITY.MINOR).css).toBeDefined();
      expect(getAnomalySeverityIconType(ML_ANOMALY_SEVERITY.MAJOR).css).toBeUndefined();
    });
  });

  describe('AnomalySeverityIcon', () => {
    it('renders the minor severity icon', () => {
      const { getByTestId } = render(
        <EuiProvider>
          <AnomalySeverityIcon severity={ML_ANOMALY_SEVERITY.MINOR} />
        </EuiProvider>
      );

      expect(getByTestId('apmAlertDetailsAnomalySeverityIcon-minor')).toBeInTheDocument();
    });

    it('renders crossCircle for critical severity', () => {
      const { getByTestId } = render(
        <EuiProvider>
          <AnomalySeverityIcon severity={ML_ANOMALY_SEVERITY.CRITICAL} />
        </EuiProvider>
      );

      expect(getByTestId('apmAlertDetailsAnomalySeverityIcon-critical')).toBeInTheDocument();
    });
  });
});
