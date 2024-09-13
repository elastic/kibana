/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import './setting_with_sibling_flyout.scss';

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

const DEFAULT_TITLE = i18n.translate('xpack.lens.colorSiblingFlyoutTitle', {
  defaultMessage: 'Color',
});

export function SettingWithSiblingFlyout({
  siblingRef,
  children,
  title = DEFAULT_TITLE,
  isInlineEditing,
  SettingTrigger,
  dataTestSubj = 'lns-settingWithSiblingFlyout',
}: {
  title?: string;
  siblingRef: MutableRefObject<HTMLDivElement | null>;
  SettingTrigger: ({ onClick }: { onClick: () => void }) => JSX.Element;
  children?: React.ReactElement | React.ReactElement[];
  isInlineEditing?: boolean;
  dataTestSubj?: string;
}) {
  const [focusTrapIsEnabled, setFocusTrapIsEnabled] = useState(false);
  const [isFlyoutOpen, setIsFlyoutOpen] = useState(false);

  const toggleFlyout = () => {
    setIsFlyoutOpen(!isFlyoutOpen);
  };

  const closeFlyout = () => {
    setIsFlyoutOpen(false);
    setFocusTrapIsEnabled(false);
  };

  useEffect(() => {
    // The EuiFocusTrap is disabled when inline editing as it causes bugs with comboboxes
    if (isFlyoutOpen && !isInlineEditing) {
      // without setTimeout here the flyout pushes content when animating
      setTimeout(() => {
        setFocusTrapIsEnabled(true);
      }, 255);
    }
  }, [isInlineEditing, isFlyoutOpen]);

  return (
    <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false} css={{ cursor: 'pointer' }}>
      <SettingTrigger onClick={toggleFlyout} />
      {isFlyoutOpen && siblingRef.current && (
        <EuiPortal insert={{ sibling: siblingRef.current, position: 'after' }}>
          <EuiFocusTrap disabled={!focusTrapIsEnabled} clickOutsideDisables={true}>
            <EuiOutsideClickDetector onOutsideClick={closeFlyout} isDisabled={!isFlyoutOpen}>
              <div
                role="dialog"
                aria-labelledby="lnsSettingWithSiblingFlyoutTitle"
                data-test-subj={dataTestSubj}
                className="lnsSettingWithSiblingFlyout"
              >
                <EuiFlyoutHeader hasBorder className="lnsSettingWithSiblingFlyout__header">
                  <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                    <EuiFlexItem grow={false}>
                      <EuiButtonIcon
                        color="text"
                        data-test-subj="lns-indexPattern-SettingWithSiblingFlyoutBack"
                        className="lnsSettingWithSiblingFlyout__backIcon"
                        onClick={closeFlyout}
                        iconType="sortLeft"
                        aria-label={i18n.translate('xpack.lens.settingWithSiblingFlyout.back', {
                          defaultMessage: 'Back',
                        })}
                      />
                    </EuiFlexItem>
                    <EuiFlexItem>
                      <EuiTitle size="xs">
                        <h3
                          id="lnsSettingWithSiblingFlyoutTitle"
                          className="lnsSettingWithSiblingFlyout__headerTitle"
                        >
                          {title}
                        </h3>
                      </EuiTitle>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiFlyoutHeader>

                {children && <div className="lnsSettingWithSiblingFlyout__content">{children}</div>}

                <EuiFlyoutFooter className="lnsSettingWithSiblingFlyout__footer">
                  <EuiButtonEmpty flush="left" size="s" iconType="sortLeft" onClick={closeFlyout}>
                    {i18n.translate('xpack.lens.settingWithSiblingFlyout.back', {
                      defaultMessage: 'Back',
                    })}
                  </EuiButtonEmpty>
                </EuiFlyoutFooter>
              </div>
            </EuiOutsideClickDetector>
          </EuiFocusTrap>
        </EuiPortal>
      )}
    </EuiFlexGroup>
  );
}
