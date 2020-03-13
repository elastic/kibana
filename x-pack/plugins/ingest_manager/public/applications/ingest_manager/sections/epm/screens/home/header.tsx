/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem, EuiImage, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import React from 'react';
import styled from 'styled-components';
import { useLinks } from '../../hooks';

export function HeroCopy() {
  return (
    <EuiFlexGroup direction="column" gutterSize="m" justifyContent="center">
      <EuiFlexItem grow={false}>
        <EuiText>
          <h1>
            <FormattedMessage
              id="xpack.ingestManager.epm.pageTitle"
              defaultMessage="Elastic Package Manager"
            />
          </h1>
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText color="subdued">
          <p>
            <FormattedMessage
              id="xpack.ingestManager.epm.pageSubtitle"
              defaultMessage="Browse packages for popular apps and services."
            />
          </p>
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

export function HeroImage() {
  const { toAssets } = useLinks();
  const ImageWrapper = styled.div`
    margin-bottom: -38px; // revert to -62px when tabs are restored
  `;

  return (
    <ImageWrapper>
      <EuiImage
        alt="Illustration of computer"
        url={toAssets('illustration_kibana_getting_started@2x.png')}
      />
    </ImageWrapper>
  );
}
