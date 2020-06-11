/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo, MouseEventHandler } from 'react';
import { EuiFlyoutHeader, CommonProps, EuiButtonEmpty } from '@elastic/eui';
import styled from 'styled-components';

export type FlyoutSubHeaderProps = CommonProps & {
  children?: React.ReactNode;
  backButton?: {
    title: string;
    onClick: MouseEventHandler<HTMLButtonElement | HTMLAnchorElement>;
    href?: string;
  };
};

const StyledEuiFlyoutHeader = styled(EuiFlyoutHeader)`
  padding: ${(props) => props.theme.eui.paddingSizes.s};

  &.hasButtons {
    .buttons {
      padding-bottom: ${(props) => props.theme.eui.paddingSizes.s};
    }

    .flyoutSubHeaderBackButton {
      font-size: ${(props) => props.theme.eui.euiFontSizeXS};
    }
    .back-button-content {
      padding-left: 0;
      &-text {
        margin-left: 0;
      }
    }
  }

  .flyout-content {
    padding-left: ${(props) => props.theme.eui.paddingSizes.m};
  }
`;

const BUTTON_CONTENT_PROPS = Object.freeze({ className: 'back-button-content' });
const BUTTON_TEXT_PROPS = Object.freeze({ className: 'back-button-content-text' });

/**
 * A Eui Flyout Header component that has its styles adjusted to display a panel sub-header.
 * Component also provides a way to display a "back" button above the header title.
 */
export const FlyoutSubHeader = memo<FlyoutSubHeaderProps>(
  ({ children, backButton, ...otherProps }) => {
    return (
      <StyledEuiFlyoutHeader {...otherProps} className={backButton && `hasButtons`}>
        {backButton && (
          <div className="buttons">
            {/* eslint-disable-next-line @elastic/eui/href-or-on-click */}
            <EuiButtonEmpty
              data-test-subj="flyoutSubHeaderBackButton"
              iconType="arrowLeft"
              contentProps={BUTTON_CONTENT_PROPS}
              textProps={BUTTON_TEXT_PROPS}
              size="xs"
              href={backButton?.href ?? ''}
              onClick={backButton?.onClick}
              className="flyoutSubHeaderBackButton"
            >
              {backButton?.title}
            </EuiButtonEmpty>
          </div>
        )}
        <div className={'flyout-content'}>{children}</div>
      </StyledEuiFlyoutHeader>
    );
  }
);

FlyoutSubHeader.displayName = 'FlyoutSubHeader';
