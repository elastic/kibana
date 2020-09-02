/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiFlexItem, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import styled from 'styled-components';
import {
  AVERAGE_LABEL,
  GOOD_LABEL,
  LESS_LABEL,
  MORE_LABEL,
  POOR_LABEL,
} from './translations';

const ColoredSpan = styled.div`
  height: 16px;
  width: 100%;
  cursor: pointer;
`;

const getSpanStyle = (
  position: number,
  inFocus: boolean,
  hexCode: string,
  percentage: number
) => {
  let first = position === 0 || percentage === 100;
  let last = position === 2 || percentage === 100;
  if (percentage === 100) {
    first = true;
    last = true;
  }

  const spanStyle: any = {
    backgroundColor: hexCode,
    opacity: !inFocus ? 1 : 0.3,
  };
  let borderRadius = '';

  if (first) {
    borderRadius = '4px 0 0 4px';
  }
  if (last) {
    borderRadius = '0 4px 4px 0';
  }
  if (first && last) {
    borderRadius = '4px';
  }
  spanStyle.borderRadius = borderRadius;

  return spanStyle;
};

export function ColorPaletteFlexItem({
  hexCode,
  inFocus,
  percentage,
  title,
  thresholds,
  position,
}: {
  hexCode: string;
  position: number;
  inFocus: boolean;
  percentage: number;
  title: string;
  thresholds: { good: string; bad: string };
}) {
  const good = position === 0;
  const bad = position === 2;
  const average = !good && !bad;

  const spanStyle = getSpanStyle(position, inFocus, hexCode, percentage);

  return (
    <EuiFlexItem key={hexCode} grow={false} style={{ width: percentage + '%' }}>
      <EuiToolTip
        content={i18n.translate(
          'xpack.apm.csm.dashboard.webVitals.palette.tooltip',
          {
            defaultMessage:
              '{percentage} % of users have {exp} experience because the {title} takes {moreOrLess} than {value}{averageMessage}.',
            values: {
              percentage,
              title: title?.toLowerCase(),
              exp: good ? GOOD_LABEL : bad ? POOR_LABEL : AVERAGE_LABEL,
              moreOrLess: bad || average ? MORE_LABEL : LESS_LABEL,
              value: good || average ? thresholds.good : thresholds.bad,
              averageMessage: average
                ? i18n.translate('xpack.apm.rum.coreVitals.averageMessage', {
                    defaultMessage: ' and less than {bad}',
                    values: { bad: thresholds.bad },
                  })
                : '',
            },
          }
        )}
      >
        <ColoredSpan style={spanStyle} />
      </EuiToolTip>
    </EuiFlexItem>
  );
}
