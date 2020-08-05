/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { EuiButtonIcon } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ILayer } from '../../../classes/layers/layer';

interface Props {
  layerList: ILayer[];
  fitToBounds: () => void;
}

export const FitToData: React.FunctionComponent<Props> = ({ layerList, fitToBounds }: Props) => {
  if (layerList.length === 0) {
    return null;
  }

  return (
    <EuiButtonIcon
      className="mapToolbarOverlay__button"
      onClick={fitToBounds}
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
  );
};
