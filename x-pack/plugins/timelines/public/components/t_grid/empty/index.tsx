/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiImage, EuiPanel, EuiText, EuiTitle } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { useKibana } from '../../../../../../../src/plugins/kibana_react/public';
import type { CoreStart } from '../../../../../../../src/core/public';
import { FullWidthFlexGroup, FullWidthFlexGroupHeight } from '../styles';

const panelStyle = {
  maxWidth: 500,
};

export const TGridEmpty: React.FC<{ height?: FullWidthFlexGroupHeight }> = ({
  height = 'tall',
}) => {
  const { http } = useKibana<CoreStart>().services;

  return (
    <FullWidthFlexGroup
      $height={height}
      $visible={true}
      $color="subdued"
      alignItems="center"
      justifyContent="center"
    >
      <EuiFlexItem grow={false}>
        <EuiPanel hasBorder={true} style={panelStyle}>
          <EuiFlexGroup>
            <EuiFlexItem>
              <EuiText size="s">
                <EuiTitle>
                  <h3>
                    <FormattedMessage
                      id="xpack.timelines.tgrid.empty.title"
                      defaultMessage="No results match your search criteria"
                    />
                  </h3>
                </EuiTitle>
                <p>
                  <FormattedMessage
                    id="xpack.timelines.tgrid.empty.description"
                    defaultMessage="Try searching over a longer period of time or modifying your search"
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
    </FullWidthFlexGroup>
  );
};
