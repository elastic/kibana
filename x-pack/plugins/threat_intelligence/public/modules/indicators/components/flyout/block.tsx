/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiPanel, EuiSpacer, EuiText } from '@elastic/eui';
import React, { VFC } from 'react';
import { css, euiStyled } from '@kbn/kibana-react-plugin/common';
import { Indicator } from '../../../../../common/types/indicator';
import { IndicatorFieldValue } from '../common/field_value';
import { IndicatorFieldLabel } from '../common/field_label';
import { IndicatorValueActions } from './indicator_value_actions';

/**
 * Show actions wrapper on hover. This is a helper component, limited only to Block
 */
const VisibleOnHover = euiStyled.div`
  ${({ theme }) => css`
    & {
      height: 100%;
    }

    & .actionsWrapper {
      visibility: hidden;
      display: inline-block;
      margin-inline-start: ${theme.eui.euiSizeS};
    }

    &:hover .actionsWrapper {
      visibility: visible;
    }
  `}
`;

const panelProps = {
  color: 'subdued' as const,
  hasShadow: false,
  borderRadius: 'none' as const,
  paddingSize: 's' as const,
};

export interface IndicatorBlockProps {
  indicator: Indicator;
  field: string;
  ['data-test-subj']?: string;
}

/**
 * Renders indicator field value in a rectangle, to highlight it even more
 */
export const IndicatorBlock: VFC<IndicatorBlockProps> = ({
  field,
  indicator,
  'data-test-subj': dataTestSubj,
}) => {
  return (
    <EuiPanel {...panelProps}>
      <VisibleOnHover data-test-subj={`${dataTestSubj}Item`}>
        <EuiText>
          <IndicatorFieldLabel field={field} />
        </EuiText>
        <EuiSpacer size="s" />
        <EuiText size="s">
          <IndicatorFieldValue indicator={indicator} field={field} />
          <span className="actionsWrapper">
            <IndicatorValueActions
              indicator={indicator}
              field={field}
              data-test-subj={dataTestSubj}
            />
          </span>
        </EuiText>
      </VisibleOnHover>
    </EuiPanel>
  );
};
