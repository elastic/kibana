/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import './dimension_popover.scss';

import React, { useState } from 'react';
import {
  EuiFlyoutHeader,
  EuiFlyoutFooter,
  EuiTitle,
  EuiButtonEmpty,
  EuiFlexItem,
} from '@elastic/eui';

import classNames from 'classnames';
import { i18n } from '@kbn/i18n';
import { VisualizationDimensionGroupConfig } from '../../../types';
import { DimensionFlyoutState } from './types';

export function DimensionFlyout({
  flyoutState,
  setFlyoutState,
  groups,
  accessor,
  groupId,
  trigger,
  panel,
  panelTitle,
}: {
  flyoutState: DimensionFlyoutState;
  setFlyoutState: (newState: DimensionFlyoutState) => void;
  groups: VisualizationDimensionGroupConfig[];
  accessor: string;
  groupId: string;
  trigger: React.ReactElement;
  panel: React.ReactElement;
  panelTitle: React.ReactNode;
}) {
  const [openByCreation, setIsOpenByCreation] = useState(flyoutState.openId === accessor);

  const noMatch = flyoutState.isOpen ? !groups.some((d) => d.accessors.includes(accessor)) : false;

  const closeFlyout = () => {
    setFlyoutState({
      isOpen: false,
      openId: null,
      addingToGroupId: null,
    });
    setIsOpenByCreation(false);
  };

  const flyout =
    flyoutState.isOpen &&
    (flyoutState.openId === accessor || (noMatch && flyoutState.addingToGroupId === groupId)) ? (
      <div
        role="dialog"
        aria-labelledby="lnsDimensionFlyoutTitle"
        className={classNames('lnsDimensionFlyout', {
          'lnsDimensionFlyout--noAnimation': openByCreation,
        })}
      >
        <EuiFlyoutHeader hasBorder className="lnsDimensionFlyout__header">
          <EuiTitle size="xs">
            <EuiButtonEmpty
              onClick={closeFlyout}
              data-test-subj="lns-indexPatternDimension-flyoutTitle"
              id="lnsDimensionFlyoutTitle"
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
        <EuiFlyoutFooter className="lnsDimensionFlyout__footer">
          <EuiButtonEmpty flush="left" size="s" iconType="cross" onClick={closeFlyout}>
            {i18n.translate('xpack.lens.dimensionFlyout.close', {
              defaultMessage: 'Close',
            })}
          </EuiButtonEmpty>
        </EuiFlyoutFooter>
      </div>
    ) : null;

  return (
    <>
      <div className="lnsDimensionFlyout__trigger">{trigger}</div>
      {flyout}
    </>
  );
}
