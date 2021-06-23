/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiButtonIcon, EuiPanel } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export interface Props {
  fitToBounds: () => void;
}

export function FitToData(props: Props) {
  return (
    <EuiPanel paddingSize="none" className="mapToolbarOverlay__button">
      <EuiButtonIcon
        size="s"
        onClick={props.fitToBounds}
        data-test-subj="fitToData"
        iconType="expand"
        color="text"
        aria-label={i18n.translate('xpack.maps.fitToData.fitButtonLabel', {
          defaultMessage: 'Fit to data bounds',
        })}
        title={i18n.translate('xpack.maps.fitToData.fitAriaLabel', {
          defaultMessage: 'Fit to data bounds',
        })}
      />
    </EuiPanel>
  );
}
