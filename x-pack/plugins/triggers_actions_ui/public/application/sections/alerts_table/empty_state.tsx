/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiImage,
  EuiText,
  EuiTitle,
  EuiDataGridToolBarAdditionalControlsOptions,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import icon from './assets/illustration_product_no_results_magnifying_glass.svg';

const heights = {
  tall: 490,
  short: 250,
};

const panelStyle = {
  maxWidth: 500,
};

export const EmptyState: React.FC<{
  height?: keyof typeof heights;
  controls?: EuiDataGridToolBarAdditionalControlsOptions;
}> = ({ height = 'tall', controls }) => {
  return (
    <EuiPanel color="subdued" data-test-subj="alertsStateTableEmptyState">
      {controls?.right && (
        <EuiFlexGroup alignItems="flexEnd" justifyContent="flexEnd">
          <EuiFlexItem grow={false}>{controls.right}</EuiFlexItem>
        </EuiFlexGroup>
      )}
      <EuiFlexGroup style={{ height: heights[height] }} alignItems="center" justifyContent="center">
        <EuiFlexItem grow={false}>
          <EuiPanel hasBorder={true} style={panelStyle}>
            <EuiFlexGroup>
              <EuiFlexItem>
                <EuiText size="s">
                  <EuiTitle>
                    <h3>
                      <FormattedMessage
                        id="xpack.triggersActionsUI.empty.title"
                        defaultMessage="No results match your search criteria"
                      />
                    </h3>
                  </EuiTitle>
                  <p>
                    <FormattedMessage
                      id="xpack.triggersActionsUI.empty.description"
                      defaultMessage="Try searching over a longer period of time or modifying your search"
                    />
                  </p>
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiImage style={{ width: 200, height: 148 }} size="200" alt="" url={icon} />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
