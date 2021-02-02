/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { JiraFieldsType, ConnectorJiraTypeFields } from '../../../common/api';
import { ExternalServiceFormatter } from '../types';

interface ExternalServiceParams extends JiraFieldsType {
  labels: string[];
}

const format: ExternalServiceFormatter<ExternalServiceParams>['format'] = async (theCase) => {
  const { priority = null, issueType = null, parent = null } =
    (theCase.connector.fields as ConnectorJiraTypeFields['fields']) ?? {};
  return { priority, labels: theCase.tags, issueType, parent };
};

export const jiraExternalServiceFormatter: ExternalServiceFormatter<ExternalServiceParams> = {
  format,
};
