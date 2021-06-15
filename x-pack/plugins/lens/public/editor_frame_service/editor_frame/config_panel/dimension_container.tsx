/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import './dimension_container.scss';

import React, { useState, useEffect, useCallback } from 'react';
import {
  EuiFlyoutHeader,
  EuiFlyoutFooter,
  EuiTitle,
  EuiButtonIcon,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFocusTrap,
  EuiOutsideClickDetector,
  EuiWindowEvent,
  keys,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

export function DimensionContainer({
  isOpen,
  groupLabel,
  handleClose,
  panel,
  isFullscreen,
  panelRef,
}: {
  isOpen: boolean;
  handleClose: () => boolean;
  panel: React.ReactElement | null;
  groupLabel: string;
  isFullscreen: boolean;
  panelRef: (el: HTMLDivElement) => void;
}) {
  const [focusTrapIsEnabled, setFocusTrapIsEnabled] = useState(false);

  const closeFlyout = useCallback(() => {
    const canClose = handleClose();
    if (canClose) {
      setFocusTrapIsEnabled(false);
    }
    return canClose;
  }, [handleClose]);

  const closeOnEscape = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === keys.ESCAPE) {
        const canClose = closeFlyout();
        if (canClose) {
          event.preventDefault();
        }
      }
    },
    [closeFlyout]
  );

  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('lnsBody--overflowHidden');
    } else {
      document.body.classList.remove('lnsBody--overflowHidden');
    }
    return () => {
      document.body.classList.remove('lnsBody--overflowHidden');
    };
  });

  return isOpen ? (
    <div ref={panelRef}>
      <EuiFocusTrap disabled={!focusTrapIsEnabled} clickOutsideDisables={true}>
        <EuiWindowEvent event="keydown" handler={closeOnEscape} />
        <EuiOutsideClickDetector
          onOutsideClick={() => {
            if (isFullscreen) {
              return;
            }
            closeFlyout();
          }}
          isDisabled={!isOpen}
        >
          <div
            role="dialog"
            aria-labelledby="lnsDimensionContainerTitle"
            className="lnsDimensionContainer euiFlyout"
            onAnimationEnd={() => {
              if (isOpen) {
                // EuiFocusTrap interferes with animating elements with absolute position:
                // running this onAnimationEnd, otherwise the flyout pushes content when animating
                setFocusTrapIsEnabled(true);
              }
            }}
          >
            <EuiFlyoutHeader hasBorder className="lnsDimensionContainer__header">
              <EuiFlexGroup
                gutterSize="none"
                alignItems="center"
                className="lnsDimensionContainer__headerLink"
                onClick={closeFlyout}
                responsive={false}
              >
                <EuiFlexItem grow={true}>
                  <EuiTitle size="xs">
                    <h2
                      id="lnsDimensionContainerTitle"
                      className="lnsDimensionContainer__headerTitle"
                    >
                      <strong>
                        {i18n.translate('xpack.lens.configure.configurePanelTitle', {
                          defaultMessage: '{groupLabel} configuration',
                          values: {
                            groupLabel,
                          },
                        })}
                      </strong>
                    </h2>
                  </EuiTitle>
                </EuiFlexItem>
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
              </EuiFlexGroup>
            </EuiFlyoutHeader>
            <EuiFlexItem className="eui-yScrollWithShadows" grow={1}>
              {panel}
            </EuiFlexItem>
            <EuiFlyoutFooter className="lnsDimensionContainer__footer">
              <EuiButtonEmpty flush="left" size="s" iconType="cross" onClick={closeFlyout}>
                {i18n.translate('xpack.lens.dimensionContainer.close', {
                  defaultMessage: 'Close',
                })}
              </EuiButtonEmpty>
            </EuiFlyoutFooter>
          </div>
        </EuiOutsideClickDetector>
      </EuiFocusTrap>
    </div>
  ) : null;
}
