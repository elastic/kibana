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
} from '@elastic/eui';

import classNames from 'classnames';
import { i18n } from '@kbn/i18n';
import { VisualizationDimensionGroupConfig } from '../../../types';
import { DimensionContainerState } from './types';

export function DimensionContainer({
  dimensionContainerState,
  setDimensionContainerState,
  groups,
  accessor,
  groupId,
  trigger,
  panel,
  panelTitle,
}: {
  dimensionContainerState: DimensionContainerState;
  setDimensionContainerState: (newState: DimensionContainerState) => void;
  groups: VisualizationDimensionGroupConfig[];
  accessor: string;
  groupId: string;
  trigger: React.ReactElement;
  panel: React.ReactElement;
  panelTitle: React.ReactNode;
}) {
  const [openByCreation, setIsOpenByCreation] = useState(
    dimensionContainerState.openId === accessor
  );
  const [focusTrapIsEnabled, setFocusTrapIsEnabled] = useState(false);
  const [flyoutIsVisible, setFlyoutIsVisible] = useState(false);

  const noMatch = dimensionContainerState.isOpen
    ? !groups.some((d) => d.accessors.includes(accessor))
    : false;

  const closeFlyout = () => {
    setDimensionContainerState({
      isOpen: false,
      openId: null,
      addingToGroupId: null,
    });
    setIsOpenByCreation(false);
    setFocusTrapIsEnabled(false);
    setFlyoutIsVisible(false);
  };

  const openFlyout = () => {
    setFlyoutIsVisible(true);
    setTimeout(() => {
      setFocusTrapIsEnabled(true);
    }, 255);
  };

  const flyoutShouldBeOpen =
    dimensionContainerState.isOpen &&
    (dimensionContainerState.openId === accessor ||
      (noMatch && dimensionContainerState.addingToGroupId === groupId));

  useEffect(() => {
    if (flyoutShouldBeOpen) {
      openFlyout();
    }
  });

  useEffect(() => {
    if (!flyoutShouldBeOpen) {
      if (flyoutIsVisible) {
        setFlyoutIsVisible(false);
      }
      if (focusTrapIsEnabled) {
        setFocusTrapIsEnabled(false);
      }
    }
  }, [flyoutShouldBeOpen, flyoutIsVisible, focusTrapIsEnabled]);

  const flyout = flyoutIsVisible && (
    <EuiFocusTrap disabled={!focusTrapIsEnabled} clickOutsideDisables={true}>
      <div
        role="dialog"
        aria-labelledby="lnsDimensionContainerTitle"
        className={classNames('lnsDimensionContainer', {
          'lnsDimensionContainer--noAnimation': openByCreation,
        })}
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
              <strong>{panelTitle}</strong>
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
    </EuiFocusTrap>
  );

  return (
    <>
      {trigger}
      {flyout}
    </>
  );
}
