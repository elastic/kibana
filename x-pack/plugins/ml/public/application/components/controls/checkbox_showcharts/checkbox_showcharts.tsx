/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/*
 * React component for a checkbox element to toggle charts display.
 */
import React, { FC } from 'react';

import { EuiCheckbox } from '@elastic/eui';
// @ts-ignore
import makeId from '@elastic/eui/lib/components/form/form_row/make_id';

import { FormattedMessage } from '@kbn/i18n/react';

import { useUrlState } from '../../../util/url_state';

const SHOW_CHARTS_DEFAULT = true;
const SHOW_CHARTS_APP_STATE_NAME = 'mlShowCharts';

export const useShowCharts = () => {
  const [appState, setAppState] = useUrlState('_a');

  return [
    appState?.mlShowCharts !== undefined ? appState?.mlShowCharts : SHOW_CHARTS_DEFAULT,
    (d: boolean) => setAppState(SHOW_CHARTS_APP_STATE_NAME, d),
  ];
};

export const CheckboxShowCharts: FC = () => {
  const [showCharts, setShowCarts] = useShowCharts();

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setShowCarts(e.target.checked);
  };

  return (
    <EuiCheckbox
      id={makeId()}
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
