/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, FC } from 'react';
import { AnnotationDomainTypes, LineAnnotation } from '@elastic/charts';
import { Anomaly } from '../../../../common/results_loader';
import { getSeverityColor } from '../../../../../../../../common/util/anomaly_utils';
import { ANOMALY_THRESHOLD } from '../../../../../../../../common/constants/anomalies';

interface Props {
  anomalyData?: Anomaly[];
}

interface Severities {
  critical: any[];
  major: any[];
  minor: any[];
  warning: any[];
  unknown: any[];
  low: any[];
}

function getAnomalyStyle(threshold: number) {
  return {
    line: {
      stroke: getSeverityColor(threshold),
      strokeWidth: 3,
      opacity: 1,
    },
  };
}

function splitAnomalySeverities(anomalies: Anomaly[]) {
  const severities: Severities = {
    critical: [],
    major: [],
    minor: [],
    warning: [],
    unknown: [],
    low: [],
  };
  anomalies.forEach((a) => {
    if (a.value !== 0) {
      severities[a.severity].push({ dataValue: a.time });
    }
  });
  return severities;
}

export const Anomalies: FC<Props> = ({ anomalyData }) => {
  const anomalies = anomalyData === undefined ? [] : anomalyData;
  const severities: Severities = splitAnomalySeverities(anomalies);

  return (
    <Fragment>
      <LineAnnotation
        id="low"
        domainType={AnnotationDomainTypes.XDomain}
        dataValues={severities.low}
        style={getAnomalyStyle(ANOMALY_THRESHOLD.LOW)}
        hideTooltips={true}
      />
      <LineAnnotation
        id="warning"
        domainType={AnnotationDomainTypes.XDomain}
        dataValues={severities.warning}
        style={getAnomalyStyle(ANOMALY_THRESHOLD.WARNING)}
        hideTooltips={true}
      />
      <LineAnnotation
        id="minor"
        domainType={AnnotationDomainTypes.XDomain}
        dataValues={severities.minor}
        style={getAnomalyStyle(ANOMALY_THRESHOLD.MINOR)}
        hideTooltips={true}
      />
      <LineAnnotation
        id="major"
        domainType={AnnotationDomainTypes.XDomain}
        dataValues={severities.major}
        style={getAnomalyStyle(ANOMALY_THRESHOLD.MAJOR)}
        hideTooltips={true}
      />
      <LineAnnotation
        id="critical"
        domainType={AnnotationDomainTypes.XDomain}
        dataValues={severities.critical}
        style={getAnomalyStyle(ANOMALY_THRESHOLD.CRITICAL)}
        hideTooltips={true}
      />
    </Fragment>
  );
};
