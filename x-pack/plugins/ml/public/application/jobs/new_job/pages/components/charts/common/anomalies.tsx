/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { Fragment } from 'react';
import { AnnotationDomainType, LineAnnotation } from '@elastic/charts';
import { getSeverityColor, ML_ANOMALY_THRESHOLD } from '@kbn/ml-anomaly-utils';
import type { Anomaly } from '../../../../common/results_loader';

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
        domainType={AnnotationDomainType.XDomain}
        dataValues={severities.low}
        style={getAnomalyStyle(ML_ANOMALY_THRESHOLD.LOW)}
        hideTooltips={true}
      />
      <LineAnnotation
        id="warning"
        domainType={AnnotationDomainType.XDomain}
        dataValues={severities.warning}
        style={getAnomalyStyle(ML_ANOMALY_THRESHOLD.WARNING)}
        hideTooltips={true}
      />
      <LineAnnotation
        id="minor"
        domainType={AnnotationDomainType.XDomain}
        dataValues={severities.minor}
        style={getAnomalyStyle(ML_ANOMALY_THRESHOLD.MINOR)}
        hideTooltips={true}
      />
      <LineAnnotation
        id="major"
        domainType={AnnotationDomainType.XDomain}
        dataValues={severities.major}
        style={getAnomalyStyle(ML_ANOMALY_THRESHOLD.MAJOR)}
        hideTooltips={true}
      />
      <LineAnnotation
        id="critical"
        domainType={AnnotationDomainType.XDomain}
        dataValues={severities.critical}
        style={getAnomalyStyle(ML_ANOMALY_THRESHOLD.CRITICAL)}
        hideTooltips={true}
      />
    </Fragment>
  );
};
