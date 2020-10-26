/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo, useCallback } from 'react';
import { EuiButtonGroup } from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { ViewType } from '../../../state';
import { GRID_VIEW_TOGGLE_LABEL, LIST_VIEW_TOGGLE_LABEL } from '../../translations';

export interface ViewTypeToggleProps {
  selectedOption: ViewType;
  onToggle: (type: ViewType) => void;
}

export const ViewTypeToggle = memo(({ selectedOption, onToggle }: ViewTypeToggleProps) => {
  const handleChange = useCallback(
    (id) => {
      if (id === 'list' || id === 'grid') {
        onToggle(id);
      }
    },
    [onToggle]
  );

  return (
    <EuiButtonGroup
      color="primary"
      idSelected={selectedOption}
      data-test-subj="viewTypeToggleButtonGroup"
      options={[
        {
          id: 'grid',
          iconType: 'grid',
          label: GRID_VIEW_TOGGLE_LABEL,
          'data-test-subj': 'viewTypeToggleButton',
        },
        {
          id: 'list',
          iconType: 'list',
          label: LIST_VIEW_TOGGLE_LABEL,
          'data-test-subj': 'viewTypeToggleButton',
        },
      ]}
      onChange={handleChange}
      legend={i18n.translate('xpack.securitySolution.trustedapps.viewTypeToggle.controlLegend', {
        defaultMessage: 'View type',
      })}
    />
  );
});

ViewTypeToggle.displayName = 'ViewTypeToggle';
