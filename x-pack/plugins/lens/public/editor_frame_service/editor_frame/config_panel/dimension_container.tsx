/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import './dimension_container.scss';

import React, { useState, useEffect } from 'react';
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

  const closeFlyout = () => {
    handleClose();
    setFocusTrapIsEnabled(false);
  };

  useEffect(() => {
    if (isOpen) {
      // without setTimeout here the flyout pushes content when animating
      setTimeout(() => {
        setFocusTrapIsEnabled(true);
      }, 255);
    }
  }, [isOpen]);

  return isOpen ? (
    <EuiFocusTrap disabled={!focusTrapIsEnabled} clickOutsideDisables={true}>
      <EuiOutsideClickDetector onOutsideClick={closeFlyout} isDisabled={!isOpen}>
        <div
          role="dialog"
          aria-labelledby="lnsDimensionContainerTitle"
          className="lnsDimensionContainer"
        >
          <EuiFlyoutHeader hasBorder className="lnsDimensionContainer__header">
            <EuiFlexGroup
              gutterSize="none"
              alignItems="center"
              className="lnsDimensionContainer__headerLink"
              onClick={closeFlyout}
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
