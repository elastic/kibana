/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { memo } from 'react';
import styled from 'styled-components';
import { EuiFlexGroup, EuiFlexItem, EuiImage, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { useLinks } from '../../hooks';

export const HeroCopy = memo(() => {
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
});

export const HeroImage = memo(() => {
  const { toAssets } = useLinks();
  const ImageWrapper = styled.div`
    margin-bottom: -62px;
  `;

  return (
    <ImageWrapper>
      <EuiImage
        alt="Illustration of computer"
        url={toAssets('illustration_kibana_getting_started@2x.png')}
      />
    </ImageWrapper>
  );
});
