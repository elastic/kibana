/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { euiStyled } from '../../../../../../../../../src/plugins/kibana_react/common';
import { px, unit } from '../../../../../style/variables';
import { Legend } from '../../../../shared/charts/Legend';
import { IServiceColors } from './Waterfall/waterfall_helpers/waterfall_helpers';

const Legends = euiStyled.div`
  display: flex;

  > * {
    margin-right: ${px(unit)};
    &:last-child {
      margin-right: 0;
    }
  }
`;

interface Props {
  serviceColors: IServiceColors;
}

export function ServiceLegends({ serviceColors }: Props) {
  return (
    <Legends>
      <EuiTitle size="xxxs">
        <span>
          {i18n.translate('xpack.apm.transactionDetails.servicesTitle', {
            defaultMessage: 'Services',
          })}
        </span>
      </EuiTitle>
      {Object.entries(serviceColors).map(([label, color]) => (
        <Legend key={color} color={color} text={label} />
      ))}
    </Legends>
  );
}
