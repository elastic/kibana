/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import './palette_panel_container.scss';

import { i18n } from '@kbn/i18n';
import React, { useState, useEffect, MutableRefObject } from 'react';
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
  EuiPortal,
} from '@elastic/eui';

export function PalettePanelContainer({
  isOpen,
  handleClose,
  siblingRef,
  children,
}: {
  isOpen: boolean;
  handleClose: () => void;
  siblingRef: MutableRefObject<HTMLDivElement | null>;
  children?: React.ReactElement | React.ReactElement[];
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

  return isOpen && siblingRef.current ? (
    <EuiPortal insert={{ sibling: siblingRef.current, position: 'after' }}>
      <EuiFocusTrap disabled={!focusTrapIsEnabled} clickOutsideDisables={true}>
        <EuiOutsideClickDetector onOutsideClick={closeFlyout} isDisabled={!isOpen}>
          <div
            role="dialog"
            aria-labelledby="lnsPalettePanelContainerTitle"
            data-test-subj="lns-indexPattern-PalettePanelContainer"
            className="lnsPalettePanelContainer"
          >
            <EuiFlyoutHeader hasBorder className="lnsPalettePanelContainer__header">
              <EuiFlexGroup gutterSize="s" alignItems="center">
                <EuiFlexItem grow={false}>
                  <EuiButtonIcon
                    color="text"
                    data-test-subj="lns-indexPattern-PalettePanelContainerBack"
                    className="lnsPalettePanelContainer__backIcon"
                    onClick={closeFlyout}
                    iconType="sortLeft"
                    aria-label={i18n.translate('xpack.lens.table.palettePanelContainer.back', {
                      defaultMessage: 'Back',
                    })}
                  />
                </EuiFlexItem>

                <EuiFlexItem>
                  <EuiTitle size="xs">
                    <h2
                      id="lnsPalettePanelContainerTitle"
                      className="lnsPalettePanelContainer__headerTitle"
                    >
                      <strong>
                        {i18n.translate('xpack.lens.table.palettePanelTitle', {
                          defaultMessage: 'Edit color',
                        })}
                      </strong>
                    </h2>
                  </EuiTitle>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlyoutHeader>

            {children && <div className="lnsPalettePanelContainer__content">{children}</div>}

            <EuiFlyoutFooter className="lnsPalettePanelContainer__footer">
              <EuiButtonEmpty flush="left" size="s" iconType="sortLeft" onClick={closeFlyout}>
                {i18n.translate('xpack.lens.table.palettePanelContainer.back', {
                  defaultMessage: 'Back',
                })}
              </EuiButtonEmpty>
            </EuiFlyoutFooter>
          </div>
        </EuiOutsideClickDetector>
      </EuiFocusTrap>
    </EuiPortal>
  ) : null;
}
