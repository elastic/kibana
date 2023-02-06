/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import type { EuiButtonEmpty, EuiContextMenuItem } from '@elastic/eui';
import { EuiPopover, EuiButtonIcon, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { Filter } from '@kbn/es-query';
import { isActiveTimeline } from '../../../../helpers';
import { StatefulTopN } from '../../top_n';
import { SourcererScopeName } from '../../../store/sourcerer/model';
import { useSourcererDataView } from '../../../containers/sourcerer';
import { TooltipWithKeyboardShortcut } from '../../accessibility';
import { getAdditionalScreenReaderOnlyContext } from '../utils';
import { SHOW_TOP_N_KEYBOARD_SHORTCUT } from '../keyboard_shortcut_constants';
import { isDetectionsAlertsTable } from '../../top_n/helpers';

const SHOW_TOP = (fieldName: string) =>
  i18n.translate('xpack.securitySolution.hoverActions.showTopTooltip', {
    values: { fieldName },
    defaultMessage: `Show top {fieldName}`,
  });

interface Props {
  className?: string;
  /** When `Component` is used with `EuiDataGrid`; the grid keeps a reference to `Component` for show / hide functionality.
   * When `Component` is used with `EuiContextMenu`, we pass EuiContextMenuItem to render the right style.
   */
  Component?: typeof EuiButtonEmpty | typeof EuiButtonIcon | typeof EuiContextMenuItem;
  enablePopOver?: boolean;
  field: string;
  flush?: 'left' | 'right' | 'both';
  globalFilters?: Filter[];
  iconSide?: 'left' | 'right';
  iconType?: string;
  isExpandable?: boolean;
  onClick: () => void;
  onFilterAdded?: () => void;
  ownFocus: boolean;
  paddingSize?: 's' | 'm' | 'l' | 'none';
  showTooltip?: boolean;
  showTopN: boolean;
  showLegend?: boolean;
  scopeId?: string | null;
  title?: string;
  value?: string[] | string | null;
}

export const ShowTopNButton: React.FC<Props> = React.memo(
  ({
    className,
    Component,
    enablePopOver,
    field,
    flush,
    iconSide,
    iconType,
    isExpandable,
    onClick,
    onFilterAdded,
    ownFocus,
    paddingSize,
    showLegend,
    showTooltip = true,
    showTopN,
    scopeId,
    title,
    value,
    globalFilters,
  }) => {
    const activeScope: SourcererScopeName = isActiveTimeline(scopeId ?? '')
      ? SourcererScopeName.timeline
      : scopeId != null && isDetectionsAlertsTable(scopeId)
      ? SourcererScopeName.detections
      : SourcererScopeName.default;
    const { browserFields, indexPattern } = useSourcererDataView(activeScope);

    const icon = iconType ?? 'visBarVertical';
    const side = iconSide ?? 'left';
    const buttonTitle = title ?? SHOW_TOP(field);
    const basicButton = useMemo(
      () =>
        Component ? (
          <Component
            aria-label={buttonTitle}
            className={className}
            data-test-subj="show-top-field"
            icon={icon}
            iconType={icon}
            iconSide={side}
            flush={flush}
            onClick={onClick}
            title={buttonTitle}
          >
            {buttonTitle}
          </Component>
        ) : (
          <EuiButtonIcon
            aria-label={buttonTitle}
            className="securitySolution__hoverActionButton"
            data-test-subj="show-top-field"
            iconSize="s"
            iconType={icon}
            onClick={onClick}
          />
        ),
      [Component, buttonTitle, className, flush, icon, onClick, side]
    );

    const button = useMemo(
      () =>
        showTooltip && !showTopN ? (
          <EuiToolTip
            content={
              <TooltipWithKeyboardShortcut
                additionalScreenReaderOnlyContext={getAdditionalScreenReaderOnlyContext({
                  field,
                  value,
                })}
                content={buttonTitle}
                shortcut={SHOW_TOP_N_KEYBOARD_SHORTCUT}
                showShortcut={ownFocus}
              />
            }
          >
            {basicButton}
          </EuiToolTip>
        ) : (
          basicButton
        ),
      [basicButton, buttonTitle, field, ownFocus, showTooltip, showTopN, value]
    );

    const topNPannel = useMemo(
      () => (
        <StatefulTopN
          browserFields={browserFields}
          field={field}
          indexPattern={indexPattern}
          onFilterAdded={onFilterAdded}
          paddingSize={paddingSize}
          showLegend={showLegend}
          scopeId={scopeId ?? undefined}
          toggleTopN={onClick}
          value={value}
          globalFilters={globalFilters}
        />
      ),
      [
        browserFields,
        field,
        indexPattern,
        onFilterAdded,
        paddingSize,
        showLegend,
        scopeId,
        onClick,
        value,
        globalFilters,
      ]
    );

    if (isExpandable) {
      return (
        <>
          {basicButton}
          {showTopN && topNPannel}
        </>
      );
    }

    return showTopN ? (
      enablePopOver ? (
        <EuiPopover
          button={basicButton}
          isOpen={showTopN}
          closePopover={onClick}
          panelClassName="withHoverActions__popover"
          data-test-subj="showTopNContainer"
        >
          {topNPannel}
        </EuiPopover>
      ) : (
        topNPannel
      )
    ) : (
      button
    );
  }
);

ShowTopNButton.displayName = 'ShowTopNButton';
