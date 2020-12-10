/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useCallback, useMemo } from 'react';
import { EuiCheckbox, htmlIdGenerator } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { useExplorerUrlState } from '../../../explorer/hooks/use_explorer_url_state';

const SHOW_CHARTS_DEFAULT = true;

export const useShowCharts = (): [boolean, (v: boolean) => void] => {
  const [explorerUrlState, setExplorerUrlState] = useExplorerUrlState();

  const showCharts = explorerUrlState?.mlShowCharts ?? SHOW_CHARTS_DEFAULT;

  const setShowCharts = useCallback(
    (v: boolean) => {
      setExplorerUrlState({ mlShowCharts: v });
    },
    [setExplorerUrlState]
  );

  return [showCharts, setShowCharts];
};

/*
 * React component for a checkbox element to toggle charts display.
 */
export const CheckboxShowCharts: FC = () => {
  const [showCharts, setShowCharts] = useShowCharts();

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setShowCharts(e.target.checked);
  };

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
