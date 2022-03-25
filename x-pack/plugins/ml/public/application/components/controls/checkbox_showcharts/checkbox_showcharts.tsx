/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useCallback, useMemo } from 'react';
import { EuiCheckbox, htmlIdGenerator } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import useObservable from 'react-use/lib/useObservable';
import { useAnomalyExplorerContext } from '../../../explorer/anomaly_explorer_context';

/*
 * React component for a checkbox element to toggle charts display.
 */
export const CheckboxShowCharts: FC = () => {
  const { chartsStateService } = useAnomalyExplorerContext();

  const showCharts = useObservable(
    chartsStateService.getShowCharts$(),
    chartsStateService.getShowCharts()
  );

  const onChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    chartsStateService.setShowCharts(e.target.checked);
  }, []);

  const id = useMemo(() => htmlIdGenerator()(), []);

  return (
    <EuiCheckbox
      id={id}
      label={
        <FormattedMessage
          id="xpack.ml.controls.checkboxShowCharts.showChartsCheckboxLabel"
          defaultMessage="Show charts"
        />
      }
      checked={showCharts}
      onChange={onChange}
    />
  );
};
