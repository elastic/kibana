/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo } from 'react';
import { i18n } from '@kbn/i18n';
import styled from 'styled-components';
import { EuiFlexGroup, EuiFlexItem, EuiImage, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { useLinks } from '../../hooks';
import { useCore } from '../../../../hooks';

export const HeroCopy = memo(() => {
  return (
    <EuiFlexGroup direction="column" gutterSize="s" justifyContent="center">
      <EuiFlexItem grow={false}>
        <EuiText>
          <h1>
            <FormattedMessage
              id="xpack.ingestManager.epm.pageTitle"
              defaultMessage="Elastic Integrations"
            />
          </h1>
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText color="subdued">
          <p>
            <FormattedMessage
              id="xpack.ingestManager.epm.pageSubtitle"
              defaultMessage="Browse integrations for popular apps and services."
            />
          </p>
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});

export const HeroImage = memo(() => {
  const { toAssets } = useLinks();
  const { uiSettings } = useCore();
  const IS_DARK_THEME = uiSettings.get('theme:darkMode');

  const Illustration = styled(EuiImage).attrs((props) => ({
    alt: i18n.translate('xpack.ingestManager.epm.illustrationAltText', {
      defaultMessage: 'Illustration of an Elastic integration',
    }),
    url: IS_DARK_THEME
      ? toAssets('illustration_integrations_darkmode.svg')
      : toAssets('illustration_integrations_lightmode.svg'),
  }))`
    margin-bottom: -68px;
    width: 80%;
  `;

  return <Illustration />;
});
