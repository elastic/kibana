/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fs from 'fs';
import path, { join, resolve } from 'path';
import mustache from 'mustache';
import type { CaseSavedObjectTransformed } from '../../../common/types/case';
import { CaseStatuses, CaseSeverity } from '../../../../common/api';

const getStatusColor = (status: string): string => {
  if (!status) {
    return '#000';
  }

  switch (status) {
    case CaseStatuses.open:
      return '#0077CC';
    case CaseStatuses['in-progress']:
      return '#FEC514';
    case CaseStatuses.closed:
      return '#D3DAE6';
    default:
      return '#0077CC';
  }
};

const getSeverityColor = (severity: string): string => {
  if (!severity) {
    return '#000';
  }

  switch (severity) {
    case CaseSeverity.LOW:
      return '#54B399';
    case CaseSeverity.MEDIUM:
      return '#D6BF57';
    case CaseSeverity.HIGH:
      return '#DA8B45';
    case CaseSeverity.CRITICAL:
      return '#E7664C';
    default:
      return '#54B399';
  }
};

export const getEmailBodyContent = (
  caseData: CaseSavedObjectTransformed,
  caseUrl: string,
  numberOfAlerts: number
) => {
  const filePath = '../templates';
  const dir = resolve(join(__dirname, filePath));

  const dataPath = path.join(dir, 'notify_user_template.html');

  return new Promise((resolve, reject) =>
    fs.readFile(dataPath, 'utf8', (error, data) => {
      if (error) {
        reject(error);
      } else {
        const template = mustache.render(data, {
          title: caseData.attributes.title,
          status: caseData.attributes.status,
          statusColor: getStatusColor(caseData.attributes.status),
          severity: caseData.attributes.severity,
          severityColor: getSeverityColor(caseData.attributes.severity),
          tags: caseData.attributes.tags.length ? caseData.attributes.tags : ['-'],
          description:
            caseData.attributes.description.length > 300
              ? `${caseData.attributes.description.slice(0, 300)}...`
              : caseData.attributes.description,
          alerts: numberOfAlerts,
          url: caseUrl,
        });

        resolve(template);
      }
    })
  );
};
