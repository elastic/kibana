/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiLink } from '@elastic/eui';
import { css } from '@emotion/react';
import { FormattedMessage } from '@kbn/i18n-react';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import React from 'react';
import { useKibana } from '../hooks/use_kibana';

const bottomBarCss = css`
  animation: none !important; // disable the animation to prevent the footer from flickering
`;
const containerCss = css`
  min-height: 40px;
`;

interface ButtonsFooterProps {
  hideCancel?: boolean;
  cancelButtonText?: string;
  isNextDisabled?: boolean;
  nextButtonText?: string;
  onNext?: () => void;
  backButtonText?: string;
  onBack?: () => void;
}
export const ButtonsFooter = React.memo<ButtonsFooterProps>(
  ({
    hideCancel = false,
    cancelButtonText,
    isNextDisabled = false,
    nextButtonText,
    onNext,
    backButtonText,
    onBack,
  }) => {
    const integrationsUrl = useKibana().services.application.getUrlForApp('integrations');
    return (
      <KibanaPageTemplate.BottomBar paddingSize="s" usePortal={false} css={bottomBarCss}>
        <EuiFlexGroup
          direction="row"
          justifyContent="spaceBetween"
          alignItems="center"
          gutterSize="l"
          css={containerCss}
        >
          <EuiFlexItem>
            {!hideCancel && (
              <EuiLink href={integrationsUrl} color="text">
                {cancelButtonText || (
                  <FormattedMessage
                    id="xpack.integrationAssistant.footer.cancel"
                    defaultMessage="Cancel"
                  />
                )}
              </EuiLink>
            )}
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiFlexGroup
              direction="row"
              justifyContent="flexEnd"
              alignItems="center"
              gutterSize="l"
            >
              <EuiFlexItem grow={false}>
                {onBack && (
                  <EuiLink onClick={onBack} color="text">
                    {backButtonText || (
                      <FormattedMessage
                        id="xpack.integrationAssistant.footer.back"
                        defaultMessage="Back"
                      />
                    )}
                  </EuiLink>
                )}
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                {onNext && (
                  <EuiButton fill color="primary" onClick={onNext} isDisabled={isNextDisabled}>
                    {nextButtonText || (
                      <FormattedMessage
                        id="xpack.integrationAssistant.footer.next"
                        defaultMessage="Next"
                      />
                    )}
                  </EuiButton>
                )}
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </KibanaPageTemplate.BottomBar>
    );
  }
);
ButtonsFooter.displayName = 'ButtonsFooter';
