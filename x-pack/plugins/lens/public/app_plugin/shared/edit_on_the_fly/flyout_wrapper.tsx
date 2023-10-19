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
  EuiTitle,
  EuiIcon,
  EuiToolTip,
  EuiButton,
  EuiLink,
} from '@elastic/eui';
import { euiThemeVars } from '@kbn/ui-theme';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { FlyoutWrapperProps } from './types';

export const FlyoutWrapper = ({
  children,
  attributesChanged,
  isInlineFooterVisible,
  displayFlyoutHeader,
  onCancel,
  navigateToLensEditor,
  onApply,
}: FlyoutWrapperProps) => {
  return (
    <>
      <EuiFlyoutBody
        className="lnsEditFlyoutBody"
        css={css`
          // styles needed to display extra drop targets that are outside of the config panel main area
          overflow-y: auto;
          padding-left: ${euiThemeVars.euiFormMaxWidth};
          margin-left: -${euiThemeVars.euiFormMaxWidth};
          pointer-events: none;
          .euiFlyoutBody__overflow {
            padding-left: inherit;
            margin-left: inherit;
            > * {
              pointer-events: auto;
            }
          }
          .euiFlyoutBody__overflowContent {
            padding: 0;
          }
        `}
      >
        <EuiFlexGroup gutterSize="none" direction="column">
          {displayFlyoutHeader && (
            <EuiFlexItem
              data-test-subj="editFlyoutHeader"
              css={css`
                padding: ${euiThemeVars.euiSizeL};
                border-block-end: 1px solid ${euiThemeVars.euiBorderColor};
              `}
            >
              <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" responsive={false}>
                <EuiFlexItem grow={false}>
                  <EuiFlexGroup alignItems="center" gutterSize="xs">
                    <EuiFlexItem grow={false}>
                      <EuiTitle size="xs">
                        <h2 id="Edit visualization">
                          {i18n.translate('xpack.lens.config.editVisualizationLabel', {
                            defaultMessage: 'Edit visualization',
                          })}
                        </h2>
                      </EuiTitle>
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiToolTip
                        content={i18n.translate('xpack.lens.config.experimentalLabel', {
                          defaultMessage:
                            'Technical preview, ES|QL currently offers limited configuration options',
                        })}
                      >
                        <EuiIcon type="beaker" size="m" />
                      </EuiToolTip>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiFlexItem>
                {navigateToLensEditor && (
                  <EuiFlexItem grow={false}>
                    <EuiLink
                      onClick={navigateToLensEditor}
                      data-test-subj="navigateToLensEditorLink"
                    >
                      {i18n.translate('xpack.lens.config.editLinkLabel', {
                        defaultMessage: 'Edit in Lens',
                      })}
                    </EuiLink>
                  </EuiFlexItem>
                )}
              </EuiFlexGroup>
            </EuiFlexItem>
          )}
          {children}
        </EuiFlexGroup>
      </EuiFlyoutBody>
      {isInlineFooterVisible && (
        <EuiFlyoutFooter>
          <EuiFlexGroup justifyContent="spaceBetween">
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
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
                iconType="check"
                isDisabled={!attributesChanged}
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
