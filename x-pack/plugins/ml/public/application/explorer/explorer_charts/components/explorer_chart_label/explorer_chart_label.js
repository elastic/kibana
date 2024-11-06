/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import './_explorer_chart_label.scss';
import PropTypes from 'prop-types';
import React, { useCallback } from 'react';

import { EuiFlexGroup, EuiFlexItem, EuiIconTip, EuiText, EuiTextColor } from '@elastic/eui';

import { ExplorerChartLabelBadge } from './explorer_chart_label_badge';
import { ExplorerChartInfoTooltip } from '../../explorer_chart_info_tooltip';
import { EntityFilter } from './entity_filter';

export function ExplorerChartLabel({
  detectorLabel,
  entityFields,
  infoTooltip,
  mode,
  wrapLabel = false,
  onSelectEntity,
}) {
  // Depending on whether we wrap the entityField badges to a new line, we render this differently:
  //
  // 1. All in one line:
  //   <detectorLabel> - <entityBadge1> <entityBadge2> ... <infoIcon>
  //
  // 2. Multiple lines:
  //   <detectorLabel> <infoIcon>
  //   <entityBadge1> <entityBadge2> ...

  // Using &nbsp;s here to make sure those spaces get rendered.
  const labelSeparator =
    wrapLabel === true || entityFields.length === 0 || detectorLabel.length === 0 ? (
      <React.Fragment>&nbsp;</React.Fragment>
    ) : (
      <React.Fragment>&nbsp;&ndash;&nbsp;</React.Fragment>
    );

  const applyFilter = useCallback(
    ({ influencerFieldName, influencerFieldValue, action }) =>
      onSelectEntity(influencerFieldName, influencerFieldValue, action),
    [onSelectEntity]
  );

  const entityFieldBadges = entityFields.map((entity) => {
    const key = `${infoTooltip.chartFunction}-${entity.fieldName}-${entity.fieldType}-${entity.fieldValue}`;
    return (
      <EuiFlexGroup gutterSize="none" alignItems="center" key={`badge-wrapper-${key}`}>
        <EuiFlexItem grow={false}>
          {mode === 'embeddable' ? (
            <EuiText size="xs">
              <EuiTextColor color={'success'} component={'span'}>
                {`(${entity.fieldName}: ${entity.fieldValue})`}
              </EuiTextColor>
            </EuiText>
          ) : (
            <ExplorerChartLabelBadge entity={entity} />
          )}
        </EuiFlexItem>

        {onSelectEntity !== undefined && (
          <EuiFlexItem grow={false}>
            <EntityFilter
              mode={mode}
              onFilter={applyFilter}
              influencerFieldName={entity.fieldName}
              influencerFieldValue={entity.fieldValue}
            />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    );
  });

  const infoIcon = (
    <span className="ml-explorer-chart-info-icon">
      <EuiIconTip
        className="ml-explorer-chart-eui-icon-tip"
        content={<ExplorerChartInfoTooltip {...infoTooltip} />}
        position="top"
        size="s"
      />
    </span>
  );

  return (
    <React.Fragment>
      <span className="ml-explorer-chart-label">
        <span className="ml-explorer-chart-label-detector">
          {detectorLabel}
          {labelSeparator}
        </span>
        {wrapLabel && infoIcon}
        {!wrapLabel && (
          <React.Fragment>
            {entityFieldBadges} {infoIcon}
          </React.Fragment>
        )}
      </span>
      {wrapLabel && <span className="ml-explorer-chart-label-badges">{entityFieldBadges}</span>}
    </React.Fragment>
  );
}
ExplorerChartLabel.propTypes = {
  detectorLabel: PropTypes.object.isRequired,
  entityFields: PropTypes.arrayOf(ExplorerChartLabelBadge.propTypes.entity),
  infoTooltip: PropTypes.object.isRequired,
  wrapLabel: PropTypes.bool,
};
