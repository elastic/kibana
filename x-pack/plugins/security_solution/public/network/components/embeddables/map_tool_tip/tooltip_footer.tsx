/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIcon,
  EuiText,
} from '@elastic/eui';
import { euiLightVars as theme } from '@kbn/ui-theme';
import styled from 'styled-components';
import * as i18n from '../translations';

export const Icon = styled(EuiIcon)`
  margin-right: ${theme.euiSizeS};
`;

Icon.displayName = 'Icon';

interface MapToolTipFooterProps {
  featureIndex: number;
  totalFeatures: number;
  previousFeature: () => void;
  nextFeature: () => void;
}

export const ToolTipFooterComponent = ({
  featureIndex,
  totalFeatures,
  previousFeature,
  nextFeature,
}: MapToolTipFooterProps) => {
  return (
    <>
      <EuiHorizontalRule margin="s" />
      <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" gutterSize="xs">
        <EuiFlexItem grow={false}>
          <EuiText size="xs">
            {i18n.MAP_TOOL_TIP_FEATURES_FOOTER(featureIndex + 1, totalFeatures)}
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <span>
            <EuiButtonIcon
              data-test-subj={'previous-feature-button'}
              color={'text'}
              onClick={previousFeature}
              iconType="arrowLeft"
              aria-label="Next"
              isDisabled={featureIndex <= 0}
            />
            <EuiButtonIcon
              data-test-subj={'next-feature-button'}
              color={'text'}
              onClick={nextFeature}
              iconType="arrowRight"
              aria-label="Next"
              isDisabled={featureIndex >= totalFeatures - 1}
            />
          </span>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};

ToolTipFooterComponent.displayName = 'ToolTipFooterComponent';

export const ToolTipFooter = React.memo(ToolTipFooterComponent);

ToolTipFooter.displayName = 'ToolTipFooter';
