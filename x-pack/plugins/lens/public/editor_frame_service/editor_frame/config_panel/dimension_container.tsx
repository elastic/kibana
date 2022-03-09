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

/**
 * The dimension container is set up to close when it detects a click outside it.
 * Use this CSS class to exclude particular elements from this behavior.
 */
export const DONT_CLOSE_DIMENSION_CONTAINER_ON_CLICK_CLASS =
  'lensDontCloseDimensionContainerOnClick';

function fromExcludedClickTarget(event: Event) {
  for (
    let node: HTMLElement | null = event.target as HTMLElement;
    node !== null;
    node = node!.parentElement
  ) {
    if (node.classList!.contains(DONT_CLOSE_DIMENSION_CONTAINER_ON_CLICK_CLASS)) {
      return true;
    }
  }
  return false;
}

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
          onOutsideClick={(event) => {
            if (isFullscreen || fromExcludedClickTarget(event)) {
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
              <EuiFlexGroup gutterSize="m" alignItems="center" responsive={false}>
                <EuiFlexItem grow={true}>
                  <EuiTitle size="xs">
                    <h2
                      id="lnsDimensionContainerTitle"
                      className="lnsDimensionContainer__headerTitle"
                    >
                      <strong>
                        {i18n.translate('xpack.lens.configure.configurePanelTitle', {
                          defaultMessage: '{groupLabel}',
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

            <div className="lnsDimensionContainer__content">{panel}</div>

            <EuiFlyoutFooter className="lnsDimensionContainer__footer">
              <EuiButtonEmpty
                flush="left"
                size="s"
                iconType="cross"
                onClick={closeFlyout}
                data-test-subj="lns-indexPattern-dimensionContainerClose"
              >
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
