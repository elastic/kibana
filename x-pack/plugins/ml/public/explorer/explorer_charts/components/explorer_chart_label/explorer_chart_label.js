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

export function ExplorerChartLabel({ detectorLabel, entityFields, infoTooltip, wrapLabel }) {
  /*
    Depending on whether we wrap the entityField badges to a new line, we render this differently:

    1. All in one line:
        <detectorLabel> - <entityBadge1> <entityBadge2> ... <infoIcon>

    2. Multiple lines:
        <detectorLabel> <infoIcon> <br />
        <entityBadge1> <entityBadge2> ...
  */

  const labelSeparator = (wrapLabel === true) ? <br /> : ' - ';

  const entityFieldBadges = entityFields.map((entity, j) => {
    return <span key={j}><ExplorerChartLabelBadge entity={entity} /> </span>;
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
        {(detectorLabel.length > 0 && entityFields.length > 0) && (
          <React.Fragment>{wrapLabel && infoIcon} {labelSeparator} </React.Fragment>
        )}
        {!wrapLabel && entityFieldBadges}
        {!wrapLabel && infoIcon}
      </span>
      {wrapLabel && (
        <div className="ml-explorer-chart-label-fields">{entityFieldBadges}</div>
      )}
    </React.Fragment>
  );
}
ExplorerChartLabel.propTypes = {
  series: PropTypes.shape({
    detectorLabel: PropTypes.string.isRequired,
    entityFields: PropTypes.array.isRequired
  })
};
