/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useState } from 'react';
import {
  EuiPopover,
  EuiBottomBar,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import classNames from 'classnames';
import { Links } from '../../links';

interface Props {
  toggleRequestFlyout: () => void;
  isRequestFlyoutOpen: boolean;
  isLoading: boolean;
  reset: () => void;
  links: Links;
  isNavDrawerLocked: boolean;
  isNavLegacy: boolean;
}

export function MainControls({
  toggleRequestFlyout,
  isRequestFlyoutOpen,
  reset,
  links,
  isNavDrawerLocked,
  isNavLegacy,
}: Props) {
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  const items = [
    <EuiContextMenuItem
      key="walkthrough"
      icon="popout"
      href={links.painlessWalkthrough}
      target="_blank"
      onClick={() => setIsHelpOpen(false)}
    >
      {i18n.translate('xpack.painlessLab.walkthroughButtonLabel', {
        defaultMessage: 'Walkthrough',
      })}
    </EuiContextMenuItem>,

    <EuiContextMenuItem
      key="api"
      icon="popout"
      href={links.painlessAPIReference}
      target="_blank"
      onClick={() => setIsHelpOpen(false)}
    >
      {i18n.translate('xpack.painlessLab.apiReferenceButtonLabel', {
        defaultMessage: 'API reference',
      })}
    </EuiContextMenuItem>,

    <EuiContextMenuItem
      key="languageSpec"
      icon="popout"
      href={links.painlessLangSpec}
      target="_blank"
      onClick={() => setIsHelpOpen(false)}
    >
      {i18n.translate('xpack.painlessLab.languageSpecButtonLabel', {
        defaultMessage: 'Language spec',
      })}
    </EuiContextMenuItem>,

    <EuiContextMenuItem
      key="reset"
      icon="bolt"
      onClick={() => {
        reset();
        setIsHelpOpen(false);
      }}
    >
      {i18n.translate('xpack.painlessLab.resetButtonLabel', {
        defaultMessage: 'Reset script',
      })}
    </EuiContextMenuItem>,
  ];

  // TODO #64541
  // Can delete all this class stuff
  let classes = '';
  if (isNavLegacy) {
    classes = classNames('painlessLab__bottomBar', {
      'painlessLab__bottomBar-isNavDrawerLocked': isNavDrawerLocked,
    });
  }

  return (
    <EuiBottomBar paddingSize="s" className={classes}>
      <EuiFlexGroup gutterSize="s" justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="s" justifyContent="flexStart">
            <EuiFlexItem grow={false}>
              <EuiPopover
                id="painlessLabHelpContextMenu"
                button={
                  <EuiButtonEmpty
                    size="s"
                    iconType="help"
                    iconSide="left"
                    color="ghost"
                    onClick={() => setIsHelpOpen(!isHelpOpen)}
                  >
                    {i18n.translate('xpack.painlessLab.helpButtonLabel', {
                      defaultMessage: 'Help',
                    })}
                  </EuiButtonEmpty>
                }
                isOpen={isHelpOpen}
                closePopover={() => setIsHelpOpen(false)}
                panelPaddingSize="none"
                withTitle
                anchorPosition="upLeft"
              >
                <EuiContextMenuPanel items={items} />
              </EuiPopover>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            size="s"
            color="ghost"
            onClick={toggleRequestFlyout}
            data-test-subj="btnViewRequest"
          >
            {isRequestFlyoutOpen
              ? i18n.translate('xpack.painlessLab.hideRequestButtonLabel', {
                  defaultMessage: 'Hide API request',
                })
              : i18n.translate('xpack.painlessLab.showRequestButtonLabel', {
                  defaultMessage: 'Show API request',
                })}
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiBottomBar>
  );
}
