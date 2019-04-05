/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InjectedIntl, injectI18n } from '@kbn/i18n/react';
import React, { useCallback } from 'react';
import euiStyled from '../../../../../common/eui_styled_components';
import { colorTransformer, MetricsExplorerColor } from '../../../common/color_palette';

interface Props {
  intl: InjectedIntl;
  value: MetricsExplorerColor;
  onChange: (color: MetricsExplorerColor) => void;
}

export const MetricsExplorerColorPicker = injectI18n(({ intl, value, onChange }: Props) => {
  const intlPrefix = 'xpack.infra.metricsExplorer.colorPicker';
  return (
    <Container>
      {Object.values(MetricsExplorerColor).map((color, index) => {
        const Swatch = color === value ? SwatchSelected : SwatchContainer;
        return (
          <Swatch
            key={color}
            color={colorTransformer(color)}
            aria-label={intl.formatMessage(
              {
                id: `${intlPrefix}.swatchLabel`,
                defaultMessage: 'color {number}',
              },
              { number: index }
            )}
            onClick={useCallback(() => onChange(color), [onChange])}
          />
        );
      })}
    </Container>
  );
});

const Container = euiStyled.div`
  display: flex;
  align-items: center;
`;

interface SwatchProps {
  color: string;
}

const SwatchContainer = euiStyled<SwatchProps, 'button'>('button')`
  flex: 0 0 auto;
  width: 20px;
  height: 20px;
  border-radius: 4px;
  background-color: ${props => props.color}
  margin-right: 8px;
`;

const SwatchSelected = euiStyled(SwatchContainer)`
  border: 2px solid #000;
  background-clip: content-box;
  padding: 1px;
`;
