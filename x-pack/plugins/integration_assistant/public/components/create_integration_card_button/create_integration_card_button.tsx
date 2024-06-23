/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiLink,
  EuiPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiImage,
  EuiIcon,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { css } from '@emotion/react';
import integrationsImage from '../../common/images/integrations_light.svg';

const useStyles = () => {
  const { euiTheme } = useEuiTheme();
  return {
    image: css`
      width: 160px;
      height: 155px;
      object-fit: cover;
      object-position: left center;
    `,
    container: css`
      height: 135px;
    `,
    textContainer: css`
      height: 100%;
      padding: ${euiTheme.size.l} 0 ${euiTheme.size.l} ${euiTheme.size.l};
    `,
  };
};

export interface CreateIntegrationCardButtonProps {
  href: string;
}
export const CreateIntegrationCardButton = React.memo<CreateIntegrationCardButtonProps>(
  ({ href }) => {
    const styles = useStyles();
    return (
      <EuiPanel hasShadow={false} hasBorder paddingSize="none">
        <EuiFlexGroup
          justifyContent="flexEnd"
          gutterSize="none"
          css={styles.container}
          responsive={false}
        >
          <EuiFlexItem grow={false}>
            <EuiFlexGroup
              direction="column"
              gutterSize="none"
              justifyContent="spaceBetween"
              css={styles.textContainer}
            >
              <EuiFlexItem>
                <EuiTitle size="xs">
                  <h2>
                    <FormattedMessage
                      id="xpack.integrationAssistant.createIntegrationTitle"
                      defaultMessage="Can't find an Integration?"
                    />
                  </h2>
                </EuiTitle>
                <EuiText size="s">
                  <FormattedMessage
                    id="xpack.integrationAssistant.createIntegrationDescription"
                    defaultMessage="Create a custom one to fit your requirements"
                  />
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiLink color="primary" href={href}>
                  <EuiFlexGroup justifyContent="center" gutterSize="s" responsive={false}>
                    <EuiFlexItem grow={false}>
                      <EuiIcon type="plusInCircle" />
                    </EuiFlexItem>
                    <EuiFlexItem>
                      <FormattedMessage
                        id="xpack.integrationAssistant.createIntegrationButton"
                        defaultMessage="Create new integration"
                      />
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiLink>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiImage
              alt="create integration background"
              src={integrationsImage}
              css={styles.image}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    );
  }
);
CreateIntegrationCardButton.displayName = 'CreateIntegrationCardButton';
