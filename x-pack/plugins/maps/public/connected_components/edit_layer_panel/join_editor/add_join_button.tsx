/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment } from 'react';

import { EuiButtonEmpty, EuiToolTip } from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { Join } from './resources/join';
import { IVectorLayer } from '../../../classes/layers/vector_layer';
import { JoinDescriptor } from '../../../../common/descriptor_types';
import { SOURCE_TYPES } from '../../../../common/constants';

const BUTTON_LABEL = i18n.translate('xpack.maps.layerPanel.joinEditor.addJoinButton.label', {
  defaultMessage: 'Add join',
});

export interface Props {
  addJoin: () => void;
  isLayerSourceMvt: boolean;
  numJoins: number;
}

export function AddJoinButton({ addJoin, isLayerSourceMvt, numJoins }: Props) {
  const isDisabled = isLayerSourceMvt && numJoins >= 1;
  const button = (
    <EuiButtonEmpty
      onClick={addJoin}
      size="xs"
      iconType="plusInCircleFilled"
      aria-label={BUTTON_LABEL}
      isDisabled={isDisabled}
    >
      {BUTTON_LABEL}
    </EuiButtonEmpty>
  );

  return isDisabled ? (
    <EuiToolTip
      content={i18n.translate('xpack.maps.layerPanel.joinEditor.addJoinButton.mvtSingleJoinMsg', {
        defaultMessage: `Vector tiles support one join. To add multiple joins, select 'Limit results' in 'Scaling'.`,
      })}
    >
      {button}
    </EuiToolTip>
  ) : (
    button
  );
}
