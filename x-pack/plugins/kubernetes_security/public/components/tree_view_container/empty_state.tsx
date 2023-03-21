/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiPanel, EuiFlexGroup, EuiFlexItem, EuiImage, EuiText, EuiTitle } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { CSSObject } from '@emotion/serialize';
import icon from './assets/illustration_product_no_results_magnifying_glass.svg';

export const TREE_EMPTY_STATE = 'kubernetesSecurity:treeEmptyState';

const panelStyle: CSSObject = {
  maxWidth: 500,
};

const wrapperStyle: CSSObject = {
  height: 262,
};

export const EmptyState: React.FC = () => {
  return (
    <EuiPanel color="subdued" data-test-subj={TREE_EMPTY_STATE}>
      <EuiFlexGroup css={wrapperStyle} alignItems="center" justifyContent="center">
        <EuiFlexItem grow={false}>
          <EuiPanel hasBorder={true} css={panelStyle}>
            <EuiFlexGroup>
              <EuiFlexItem>
                <EuiText size="s">
                  <EuiTitle>
                    <h3>
                      <FormattedMessage
                        id="xpack.kubernetesSecurity.treeView.empty.title"
                        defaultMessage="No results match your search criteria"
                      />
                    </h3>
                  </EuiTitle>
                  <p>
                    <FormattedMessage
                      id="xpack.kubernetesSecurity.treeView.empty.description"
                      defaultMessage="Try searching over a longer period of time or modifying your search"
                    />
                  </p>
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiImage size="200" alt="" url={icon} />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
