/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiTitle,
  EuiToolTip,
  EuiButton,
  EuiLink,
  EuiBetaBadge,
} from '@elastic/eui';
import { euiThemeVars } from '@kbn/ui-theme';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { FlyoutWrapperProps } from './types';

export const FlyoutWrapper = ({
  children,
  isInlineFlyoutVisible,
  isScrollable,
  displayFlyoutHeader,
  language,
  isNewPanel,
  isSaveable,
  onCancel,
  navigateToLensEditor,
  onApply,
}: FlyoutWrapperProps) => {
  return (
    <>
      {isInlineFlyoutVisible && displayFlyoutHeader && (
        <EuiFlyoutHeader
          hasBorder
          css={css`
            pointer-events: auto;
            background-color: ${euiThemeVars.euiColorEmptyShade};
          `}
          data-test-subj="editFlyoutHeader"
        >
          <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiTitle size="xs" data-test-subj="inlineEditingFlyoutLabel">
                <h2>
                  {isNewPanel
                    ? i18n.translate('xpack.lens.config.createVisualizationLabel', {
                        defaultMessage: 'Create {lang} visualization',
                        values: { lang: language },
                      })
                    : i18n.translate('xpack.lens.config.editVisualizationLabel', {
                        defaultMessage: 'Edit {lang} visualization',
                        values: { lang: language },
                      })}
                  <EuiToolTip
                    content={
                      language
                        ? i18n.translate('xpack.lens.config.experimentalLabelTextBased', {
                            defaultMessage:
                              'Technical preview, {lang} currently offers limited configuration options',
                            values: { lang: language },
                          })
                        : i18n.translate('xpack.lens.config.experimentalLabelDataview', {
                            defaultMessage:
                              'Technical preview, inline editing currently offers limited configuration options',
                          })
                    }
                  >
                    <EuiBetaBadge
                      label="Lab"
                      iconType="beaker"
                      size="s"
                      css={css`
                        margin-left: ${euiThemeVars.euiSizeXS};
                      `}
                    />
                  </EuiToolTip>
                </h2>
              </EuiTitle>
            </EuiFlexItem>
            {navigateToLensEditor && (
              <EuiFlexItem grow={false}>
                <EuiLink onClick={navigateToLensEditor} data-test-subj="navigateToLensEditorLink">
                  {i18n.translate('xpack.lens.config.editLinkLabel', {
                    defaultMessage: 'Edit in Lens',
                  })}
                </EuiLink>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </EuiFlyoutHeader>
      )}

      <EuiFlyoutBody
        className="lnsEditFlyoutBody"
        css={css`
          // styles needed to display extra drop targets that are outside of the config panel main area
          overflow-y: auto;
          padding-left: ${euiThemeVars.euiFormMaxWidth};
          margin-left: -${euiThemeVars.euiFormMaxWidth};
          pointer-events: none;
          .euiFlyoutBody__overflow {
            -webkit-mask-image: none;
            padding-left: inherit;
            margin-left: inherit;
            ${!isScrollable &&
            `
                overflow-y: hidden;
              `}
            > * {
              pointer-events: auto;
            }
          }
          .euiFlyoutBody__overflowContent {
            padding: 0;
            block-size: 100%;
          }
        `}
      >
        {children}
      </EuiFlyoutBody>
      {isInlineFlyoutVisible && (
        <EuiFlyoutFooter>
          <EuiFlexGroup justifyContent="spaceBetween">
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                id="lnsCancelEditOnFlyFlyout"
                onClick={onCancel}
                flush="left"
                aria-label={i18n.translate('xpack.lens.config.cancelFlyoutAriaLabel', {
                  defaultMessage: 'Cancel applied changes',
                })}
                data-test-subj="cancelFlyoutButton"
              >
                <FormattedMessage
                  id="xpack.lens.config.cancelFlyoutLabel"
                  defaultMessage="Cancel"
                />
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                onClick={onApply}
                fill
                aria-label={i18n.translate('xpack.lens.config.applyFlyoutAriaLabel', {
                  defaultMessage: 'Apply changes',
                })}
                disabled={Boolean(isNewPanel) ? false : !isSaveable}
                iconType="check"
                data-test-subj="applyFlyoutButton"
              >
                <FormattedMessage
                  id="xpack.lens.config.applyFlyoutLabel"
                  defaultMessage="Apply and close"
                />
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutFooter>
      )}
    </>
  );
};
