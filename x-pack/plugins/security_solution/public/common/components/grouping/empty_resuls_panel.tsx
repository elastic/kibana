/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiImage, EuiPanel, EuiText, EuiTitle } from '@elastic/eui';
import React from 'react';
import type { CoreStart } from '@kbn/core/public';
import { FormattedMessage } from '@kbn/i18n-react';
import { useKibana } from '@kbn/kibana-react-plugin/public';

const panelStyle = {
  maxWidth: 500,
};

const heights = {
  tall: 490,
  short: 250,
};

export const EmptyGroupingComponent: React.FC<{ height?: keyof typeof heights }> = ({
  height = 'tall',
}) => {
  const { http } = useKibana<CoreStart>().services;

  return (
    <EuiPanel color="subdued" data-test-subj="empty-results-panel">
      <EuiFlexGroup style={{ height: heights[height] }} alignItems="center" justifyContent="center">
        <EuiFlexItem grow={false}>
          <EuiPanel hasBorder={true} style={panelStyle}>
            <EuiFlexGroup>
              <EuiFlexItem>
                <EuiText size="s">
                  <EuiTitle>
                    <h3>
                      <FormattedMessage
                        id="xpack.securitySolution.grouping.empty.title"
                        defaultMessage="No grouping results match your selected Group alerts field"
                      />
                    </h3>
                  </EuiTitle>
                  <p>
                    <FormattedMessage
                      id="xpack.securitySolution.grouping.empty.description"
                      defaultMessage="Try searching over a longer period of time or modifying your Group alerts field"
                    />
                  </p>
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiImage
                  size="200"
                  alt=""
                  url={http.basePath.prepend(
                    '/plugins/timelines/assets/illustration_product_no_results_magnifying_glass.svg'
                  )}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
