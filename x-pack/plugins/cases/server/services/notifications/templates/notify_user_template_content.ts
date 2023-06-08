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

  const dataPath = path.join(dir, 'premailer_dialect.html');

  fs.readFile(dataPath, 'utf8', (error, data) => {
    if (error) {
      console.log('error in promise', error);
    } else {
      const template = mustache.render(data, {
        caseTitle: caseData.attributes.title,
        caseStatus: caseData.attributes.status,
        styledStatus: () => {
          return (text: string, render: (text: string) => void) => {
            return (
              `<span style="
            width: 112px;
            font-size: 12px;
            line-height: 24px;
            padding: 4px 24px;
            border-radius: 12px;
            text-transform: uppercase;
            text-align: center;
            align-items: center;
            letter-spacing: 0.6px;
            color: #fff;
            background-color: ${getStatusColor(caseData.attributes.status)};
            ">${  render(text)  }</span>`;
          };
        },
        caseSeverity: caseData.attributes.severity,
        styledSeverity: () => {
          return (text: string, render: (text: string) => void) => {
            return (
              `<span style="
                width: 112px;
                font-size: 12px;
                line-height: 24px;
                padding: 4px 24px;
                border-radius: 12px;
                text-transform: uppercase;
                text-align: center;
                align-items: center;
                letter-spacing: 0.6px;
                color: #fff;
                background-color: ${getSeverityColor(caseData.attributes.severity)};
                ">${  render(text)  }</span>`;
          };
        },
        caseTags: caseData.attributes.tags.length ? caseData.attributes.tags : ['-'],
        caseDescription:
          caseData.attributes.description.length > 300
            ? `${caseData.attributes.description.slice(0, 300)}...`
            : caseData.attributes.description,
        caseAlerts: numberOfAlerts,
        caseUrl,
      });

      fs.writeFile('result.html', template, (err) => {
        if (err) throw err;
        console.log('The file has been saved!');
      });
    }
  });
};
