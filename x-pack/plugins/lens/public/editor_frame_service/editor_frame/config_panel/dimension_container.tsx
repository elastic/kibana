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
}: {
  isOpen: boolean;
  handleClose: () => void;
  panel: React.ReactElement;
  groupLabel: string;
}) {
  const [focusTrapIsEnabled, setFocusTrapIsEnabled] = useState(false);

  const closeFlyout = useCallback(() => {
    handleClose();
    setFocusTrapIsEnabled(false);
  }, [handleClose]);

  useEffect(() => {
    if (isOpen) {
      // without setTimeout here the flyout pushes content when animating
      setTimeout(() => {
        setFocusTrapIsEnabled(true);
      }, 255);
    }
  }, [isOpen]);

  const closeOnEscape = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === keys.ESCAPE) {
        event.preventDefault();
        closeFlyout();
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
    <EuiFocusTrap disabled={!focusTrapIsEnabled} clickOutsideDisables={true}>
      <EuiWindowEvent event="keydown" handler={closeOnEscape} />
      <EuiOutsideClickDetector onOutsideClick={closeFlyout} isDisabled={!isOpen}>
        <div
          role="dialog"
          aria-labelledby="lnsDimensionContainerTitle"
          className="lnsDimensionContainer euiFlyout"
        >
          <EuiFlyoutHeader hasBorder className="lnsDimensionContainer__header">
            <EuiFlexGroup
              gutterSize="none"
              alignItems="center"
              className="lnsDimensionContainer__headerLink"
              onClick={closeFlyout}
              responsive={false}
            >
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
  ) : null;
}
