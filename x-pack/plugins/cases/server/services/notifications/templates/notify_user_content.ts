/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fs from 'fs';
import mustache from 'mustache';
import path from 'path';
import type { CaseSavedObjectTransformed } from '../../../common/types/case';
import { CaseStatuses, CaseSeverity } from '../../../../common/api';
import { getDataPath } from './utils';

const TAG_LIMIT = 3;
const DESCRIPTION_LIMIT = 300;

export const getStatusColor = (status: string | null | undefined): string => {
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

export const getSeverityColor = (severity: string | null | undefined): string => {
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

export const getEmailBodyContent = async (
  caseData: CaseSavedObjectTransformed,
  caseUrl: string | null
): Promise<string> => {
  const templatesDir = path.join('..', 'templates');
  const fileName = 'notify_user_template.html';

  const dataPath = getDataPath(templatesDir, fileName);

  const content = await fs.promises.readFile(dataPath, 'utf8');

  const tags = caseData.attributes.tags.length ? caseData.attributes.tags : ['-'];
  const hasMoreTags = caseData.attributes.tags.length > TAG_LIMIT;

  const template = mustache.render(content, {
    title: caseData.attributes.title,
    status: caseData.attributes.status,
    statusColor: getStatusColor(caseData.attributes.status),
    severity: caseData.attributes.severity,
    severityColor: getSeverityColor(caseData.attributes.severity),
    hasMoreTags: hasMoreTags ? caseData.attributes.tags.length - TAG_LIMIT : null,
    tags: tags.slice(0, TAG_LIMIT),
    description:
      caseData.attributes.description.length > DESCRIPTION_LIMIT
        ? `${caseData.attributes.description.slice(0, DESCRIPTION_LIMIT)}...`
        : caseData.attributes.description,
    url: caseUrl,
  });

  return template;
};
