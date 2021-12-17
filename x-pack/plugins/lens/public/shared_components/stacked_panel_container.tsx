/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import './stacked_panel_container.scss';
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

export interface StackedPanelProps {
  isOpen: boolean;
  handleClose: () => void;
  children: React.ReactElement | React.ReactElement[];
  siblingRef: MutableRefObject<HTMLDivElement | null>;
  idPrefix: string;
  title: string;
}

export function StackedPanelContainer({
  isOpen,
  handleClose,
  children,
  siblingRef,
  idPrefix,
  title,
}: StackedPanelProps) {
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
      <EuiFocusTrap disabled={!focusTrapIsEnabled} clickOutsideDisables>
        <EuiOutsideClickDetector onOutsideClick={closeFlyout} isDisabled={!isOpen}>
          <div
            role="dialog"
            aria-labelledby={`lns${idPrefix}ContainerTitle`}
            data-test-subj={`lns-indexPattern-${idPrefix}Container`}
            className={`lns${idPrefix}Container lnsStackedPanelContainer`}
          >
            <EuiFlyoutHeader
              hasBorder
              className={`lns${idPrefix}Container__header lnsStackedPanelContainer__header`}
            >
              <EuiFlexGroup gutterSize="s" alignItems="center">
                <EuiFlexItem grow={false}>
                  <EuiButtonIcon
                    color="text"
                    data-test-subj={`lns-indexPattern-${idPrefix}ContainerBack`}
                    className={`lns${idPrefix}Container__backIcon lnsStackedPanelContainer__backIcon`}
                    onClick={closeFlyout}
                    iconType="sortLeft"
                    aria-label={i18n.translate('xpack.lens.table.stackedPanelContainer.back', {
                      defaultMessage: 'Back',
                    })}
                  />
                </EuiFlexItem>

                <EuiFlexItem>
                  <EuiTitle size="xs">
                    <h2
                      id={`lns${idPrefix}ContainerTitle`}
                      className={`lns${idPrefix}Container__headerTitle lnsStackedPanelContainer__headerTitle`}
                    >
                      <strong>{title}</strong>
                    </h2>
                  </EuiTitle>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlyoutHeader>

            <div className={`lns${idPrefix}Container__content lnsStackedPanelContainer__content`}>
              {children}
            </div>

            <EuiFlyoutFooter
              className={`lns${idPrefix}Container__footer lnsStackedPanelContainer__footer`}
            >
              <EuiButtonEmpty flush="left" size="s" iconType="sortLeft" onClick={closeFlyout}>
                {i18n.translate('xpack.lens.table.stackedPanelContainer.back', {
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
