/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import styled from 'styled-components';
import { EuiFlexGroup, EuiFlexItem, EuiText, EuiImage } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { PLUGIN_ID } from '../../constants';
import { WithHeaderLayout } from '../../layouts';
import { useConfig, useCore } from '../../hooks';

const ImageWrapper = styled.div`
  margin-bottom: -62px;
`;

export const EPMApp: React.FunctionComponent = () => {
  const { epm } = useConfig();
  const { http } = useCore();

  if (!epm.enabled) {
    return null;
  }

  return (
    <WithHeaderLayout
      leftColumn={
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
      }
      rightColumn={
        <ImageWrapper>
          <EuiImage
            alt="Illustration of computer"
            url={http.basePath.prepend(
              `/plugins/${PLUGIN_ID}/applications/ingest_manager/sections/epm/assets/illustration_kibana_getting_started@2x.png`
            )}
          />
        </ImageWrapper>
      }
      tabs={[
        {
          id: 'all_packages',
          name: 'All packages',
          isSelected: true,
        },
        {
          id: 'installed_packages',
          name: 'Installed packages',
        },
      ]}
    >
      hello world - fleet app
    </WithHeaderLayout>
  );
};
