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
  EuiButtonEmpty,
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
    // some internal popovers are pretty slow to unmount, so give it some time
    setTimeout(() => {
      handleClose();
      setFocusTrapIsEnabled(false);
    }, 150); // <= 150 has been chosen from empirical testing
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
            <EuiTitle size="xs">
              <EuiButtonEmpty
                onClick={closeFlyout}
                data-test-subj="lns-indexPattern-dimensionContainerTitle"
                id="lnsDimensionContainerTitle"
                iconType="sortLeft"
                flush="left"
              >
                <strong>
                  {i18n.translate('xpack.lens.configure.configurePanelTitle', {
                    defaultMessage: '{groupLabel} configuration',
                    values: {
                      groupLabel,
                    },
                  })}
                </strong>
              </EuiButtonEmpty>
            </EuiTitle>
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
