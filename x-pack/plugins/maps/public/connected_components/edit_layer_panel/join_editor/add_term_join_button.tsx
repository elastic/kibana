/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React from 'react';
import { v4 as uuidv4 } from 'uuid';
import { EuiButtonEmpty, EuiToolTip } from '@elastic/eui';
import { SOURCE_TYPES } from '../../../../common/constants';

const BUTTON_LABEL = i18n.translate('xpack.maps.layerPanel.joinEditor.termJoin.addButtonLabel', {
  defaultMessage: 'Add term join',
});

export interface Props {
  addJoin: (joinDescriptor: partial<JoinDescriptor>) => void;
  isLayerSourceMvt: boolean;
  numJoins: number;
}

export function AddTermJoinButton({ addJoin, isLayerSourceMvt, numJoins }: Props) {
  const isDisabled = isLayerSourceMvt && numJoins >= 1;
  const button = (
    <EuiButtonEmpty
      onClick={() => {
        addJoin({
          right: {
            id: uuidv4(),
            type: SOURCE_TYPES.ES_TERM_SOURCE,
            applyGlobalQuery: true,
            applyGlobalTime: true,
          }
        });
      }}
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
      content={i18n.translate('xpack.maps.layerPanel.joinEditor.termJoin.mvtSingleJoinMsg', {
        defaultMessage: `Vector tiles support one term join. To add multiple joins, select 'Limit results' in 'Scaling'.`,
      })}
    >
      {button}
    </EuiToolTip>
  ) : (
    button
  );
}
