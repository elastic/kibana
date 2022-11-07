/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  Threat,
  Threats,
  ThreatSubtechnique,
} from '@kbn/securitysolution-io-ts-alerting-types';
import { find } from 'lodash/fp';
import {
  ALERT_THREAT_FRAMEWORK,
  ALERT_THREAT_TACTIC_ID,
  ALERT_THREAT_TACTIC_NAME,
  ALERT_THREAT_TACTIC_REFERENCE,
  ALERT_THREAT_TECHNIQUE_ID,
  ALERT_THREAT_TECHNIQUE_NAME,
  ALERT_THREAT_TECHNIQUE_REFERENCE,
  ALERT_THREAT_TECHNIQUE_SUBTECHNIQUE_ID,
  ALERT_THREAT_TECHNIQUE_SUBTECHNIQUE_NAME,
  ALERT_THREAT_TECHNIQUE_SUBTECHNIQUE_REFERENCE,
  KIBANA_NAMESPACE,
} from '@kbn/rule-data-utils';
import type { TimelineEventsDetailsItem } from '@kbn/timelines-plugin/common';
import { buildThreatDescription } from '../../../../components/rules/description_step/helpers';

// TODO - it may make more sense to query source here for this information rather than piecing it together from the fields api
export const getMitreTitleAndDescription = (data: TimelineEventsDetailsItem[] | null) => {
  const threatFrameworks = [
    ...(find({ field: ALERT_THREAT_FRAMEWORK, category: KIBANA_NAMESPACE }, data)?.values ?? []),
  ];

  const tacticIdValues = [
    ...(find({ field: ALERT_THREAT_TACTIC_ID, category: KIBANA_NAMESPACE }, data)?.values ?? []),
  ];
  const tacticNameValues = [
    ...(find({ field: ALERT_THREAT_TACTIC_NAME, category: KIBANA_NAMESPACE }, data)?.values ?? []),
  ];
  const tacticReferenceValues = [
    ...(find({ field: ALERT_THREAT_TACTIC_REFERENCE, category: KIBANA_NAMESPACE }, data)?.values ??
      []),
  ];

  const techniqueIdValues = [
    ...(find({ field: ALERT_THREAT_TECHNIQUE_ID, category: KIBANA_NAMESPACE }, data)?.values ?? []),
  ];
  const techniqueNameValues = [
    ...(find({ field: ALERT_THREAT_TECHNIQUE_NAME, category: KIBANA_NAMESPACE }, data)?.values ??
      []),
  ];
  const techniqueReferenceValues = [
    ...(find({ field: ALERT_THREAT_TECHNIQUE_REFERENCE, category: KIBANA_NAMESPACE }, data)
      ?.values ?? []),
  ];

  const subTechniqueIdValues = [
    ...(find({ field: ALERT_THREAT_TECHNIQUE_SUBTECHNIQUE_ID, category: KIBANA_NAMESPACE }, data)
      ?.values ?? []),
  ];
  const subTechniqueNameValues = [
    ...(find({ field: ALERT_THREAT_TECHNIQUE_SUBTECHNIQUE_NAME, category: KIBANA_NAMESPACE }, data)
      ?.values ?? []),
  ];
  const subTechniqueReferenceValues = [
    ...(find(
      { field: ALERT_THREAT_TECHNIQUE_SUBTECHNIQUE_REFERENCE, category: KIBANA_NAMESPACE },
      data
    )?.values ?? []),
  ];

  const threatData: Threats =
    // Use the top level framework as every threat should have a framework
    threatFrameworks?.map((framework, index) => {
      const threat: Threat = {
        framework,
        tactic: {
          id: tacticIdValues[index],
          name: tacticNameValues[index],
          reference: tacticReferenceValues[index],
        },
        technique: [],
      };

      // TODO:
      // Fields api doesn't provide null entries to keep the same length of values for flattend objects
      // So for the time being rather than showing incorrect data, we'll only show tactic information when the length of both line up
      // We can replace this with a _source request and just pass that.
      if (tacticIdValues.length === techniqueIdValues.length) {
        const subtechnique: ThreatSubtechnique[] = [];
        const techniqueId = techniqueIdValues[index];
        subTechniqueIdValues.forEach((subId, subIndex) => {
          // TODO: see above comment. Without this matching, a subtechnique can be incorrectly matched with a higher level technique
          if (subId.includes(techniqueId)) {
            subtechnique.push({
              id: subTechniqueIdValues[subIndex],
              name: subTechniqueNameValues[subIndex],
              reference: subTechniqueReferenceValues[subIndex],
            });
          }
        });

        threat.technique?.push({
          id: techniqueId,
          name: techniqueNameValues[index],
          reference: techniqueReferenceValues[index],
          subtechnique,
        });
      }

      return threat;
    }) ?? [];

  // TODO: discuss moving buildThreatDescription to a shared common folder
  return threatData && threatData.length > 0
    ? buildThreatDescription({
        label: threatData[0].framework,
        threat: threatData,
      })
    : null;
};
