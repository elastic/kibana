/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import './flyout_container.scss';

import React, { useState, useEffect, useCallback } from 'react';
import { css } from '@emotion/react';
import {
  EuiFlyoutHeader,
  EuiFlyoutFooter,
  EuiTitle,
  EuiButtonIcon,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFocusTrap,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { DONT_CLOSE_DIMENSION_CONTAINER_ON_CLICK_CLASS } from '../utils';

function fromExcludedClickTarget(event: Event) {
  for (
    let node: HTMLElement | null = event.target as HTMLElement;
    node !== null;
    node = node!.parentElement
  ) {
    if (
      node.classList!.contains(DONT_CLOSE_DIMENSION_CONTAINER_ON_CLICK_CLASS) ||
      node.classList!.contains('euiBody-hasPortalContent') ||
      node.getAttribute('data-euiportal') === 'true'
    ) {
      return true;
    }
  }
  return false;
}

export function FlyoutContainer({
  isOpen,
  label,
  handleClose,
  isFullscreen,
  panelRef,
  panelContainerRef,
  children,
  customFooter,
  isInlineEditing,
}: {
  isOpen: boolean;
  handleClose: () => void;
  children: React.ReactElement | null;
  label: string;
  isFullscreen?: boolean;
  panelRef?: (el: HTMLDivElement) => void;
  panelContainerRef?: (el: HTMLDivElement) => void;
  customFooter?: React.ReactElement;
  isInlineEditing?: boolean;
}) {
  const [focusTrapIsEnabled, setFocusTrapIsEnabled] = useState(false);

  const closeFlyout = useCallback(() => {
    setFocusTrapIsEnabled(false);
    handleClose();
  }, [handleClose]);

  useEffect(() => {
    if (!isInlineEditing) {
      document.body.classList.toggle('lnsBody--overflowHidden', isOpen);
      return () => {
        if (isOpen) {
          setFocusTrapIsEnabled(false);
        }
        document.body.classList.remove('lnsBody--overflowHidden');
      };
    }
  }, [isInlineEditing, isOpen]);

  if (!isOpen) {
    return null;
  }

  return (
    <div ref={panelRef}>
      <EuiFocusTrap
        disabled={!focusTrapIsEnabled}
        clickOutsideDisables={false}
        onClickOutside={(event) => {
          if (isFullscreen || fromExcludedClickTarget(event)) {
            return;
          }
          closeFlyout();
        }}
        onEscapeKey={closeFlyout}
      >
        <div
          ref={panelContainerRef}
          role="dialog"
          aria-labelledby="lnsDimensionContainerTitle"
          className="lnsDimensionContainer"
          css={css`
            box-shadow: ${isInlineEditing ? 'none !important' : 'inherit'};
          `}
          onAnimationEnd={() => {
            if (isOpen) {
              // EuiFocusTrap interferes with animating elements with absolute position:
              // running this onAnimationEnd, otherwise the flyout pushes content when animating.
              // The EuiFocusTrap is disabled when inline editing as it causes bugs with comboboxes
              setFocusTrapIsEnabled(!Boolean(isInlineEditing));
            }
          }}
        >
          <EuiFlyoutHeader hasBorder className="lnsDimensionContainer__header">
            <EuiFlexGroup gutterSize="m" alignItems="center" responsive={false}>
              {isInlineEditing && (
                <EuiFlexItem grow={false}>
                  <EuiButtonIcon
                    color="text"
                    data-test-subj="lns-indexPattern-dimensionContainerBack"
                    className="lnsDimensionContainer__backIcon"
                    onClick={closeFlyout}
                    iconType="sortLeft"
                    aria-label={i18n.translate('xpack.lens.dimensionContainer.closeConfiguration', {
                      defaultMessage: 'Close configuration',
                    })}
                  />
                </EuiFlexItem>
              )}
              <EuiFlexItem grow={true}>
                <EuiTitle size="xs">
                  <h2
                    id="lnsDimensionContainerTitle"
                    className="lnsDimensionContainer__headerTitle"
                  >
                    {label}
                  </h2>
                </EuiTitle>
              </EuiFlexItem>

              {!isInlineEditing && (
                <EuiFlexItem grow={false}>
                  <EuiButtonIcon
                    color="text"
                    data-test-subj="lns-indexPattern-dimensionContainerBack"
                    className="lnsDimensionContainer__backIcon"
                    onClick={closeFlyout}
                    iconType="cross"
                    aria-label={i18n.translate('xpack.lens.dimensionContainer.closeConfiguration', {
                      defaultMessage: 'Close configuration',
                    })}
                  />
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          </EuiFlyoutHeader>

          <div className="lnsDimensionContainer__content">{children}</div>

          {customFooter || (
            <EuiFlyoutFooter className="lnsDimensionContainer__footer">
              <EuiButtonEmpty
                flush="left"
                size="s"
                iconType={isInlineEditing ? 'sortLeft' : 'cross'}
                onClick={closeFlyout}
                data-test-subj="lns-indexPattern-dimensionContainerClose"
              >
                {isInlineEditing
                  ? i18n.translate('xpack.lens.dimensionContainer.back', {
                      defaultMessage: 'Back',
                    })
                  : i18n.translate('xpack.lens.dimensionContainer.close', {
                      defaultMessage: 'Close',
                    })}
              </EuiButtonEmpty>
            </EuiFlyoutFooter>
          )}
        </div>
      </EuiFocusTrap>
    </div>
  );
}
