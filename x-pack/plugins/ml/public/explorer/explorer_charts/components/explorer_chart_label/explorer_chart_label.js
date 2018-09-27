/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import './styles/explorer_chart_label.less';

import PropTypes from 'prop-types';
import React from 'react';

import {
  EuiIconTip
} from '@elastic/eui';

import { ExplorerChartLabelBadge } from './explorer_chart_label_badge';
import { ExplorerChartTooltip } from '../../explorer_chart_tooltip';

export function ExplorerChartLabel({ detectorLabel, entityFields, infoTooltip, wrapLabel = false }) {
  // Depending on whether we wrap the entityField badges to a new line, we render this differently:
  //
  // 1. All in one line:
  //   <detectorLabel> - <entityBadge1> <entityBadge2> ... <infoIcon>
  //
  // 2. Multiple lines:
  //   <detectorLabel> <infoIcon>
  //   <entityBadge1> <entityBadge2> ...
  const labelSeparator = (wrapLabel === true) ? '' : ' - ';

  const entityFieldBadges = entityFields.map((entity) => {
    return <span key={`${entity.fieldName} ${entity.fieldValue}`}><ExplorerChartLabelBadge entity={entity} /> </span>;
  });

  const infoIcon = (
    <span className="ml-explorer-chart-icon">
      <EuiIconTip
        content={<ExplorerChartTooltip {...infoTooltip} />}
        position="top"
        size="s"
      />
    </span>
  );

  return (
    <React.Fragment>
      <span className="ml-explorer-chart-label-detector">
        <span>{detectorLabel}</span>
        {(detectorLabel.length > 0 && entityFields.length > 0 || wrapLabel === true) && (
          <React.Fragment>{wrapLabel && infoIcon} {labelSeparator} </React.Fragment>
        )}
        {!wrapLabel && (
          <React.Fragment>{entityFieldBadges} {infoIcon}</React.Fragment>
        )}
      </span>
      {wrapLabel && (
        <div className="ml-explorer-chart-label-fields">{entityFieldBadges}</div>
      )}
    </React.Fragment>
  );
}
ExplorerChartLabel.propTypes = {
  detectorLabel: PropTypes.string.isRequired,
  entityFields: PropTypes.arrayOf(PropTypes.shape({
    fieldName: PropTypes.string.isRequired,
    fieldValue: PropTypes.string.isRequired
  })),
  infoTooltip: PropTypes.object,
  wrapLabel: PropTypes.bool
};
