/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ServiceNowSIRFieldsType } from '../../../common/api';
import { ExternalServiceFormatter } from '../types';

interface ExternalServiceParams {
  dest_ip: string | null;
  source_ip: string | null;
  category: string | null;
  subcategory: string | null;
  malware_hash: string | null;
  malware_url: string | null;
  priority: string | null;
}

const format: ExternalServiceFormatter<ExternalServiceParams>['format'] = async (
  theCase,
  alerts
) => {
  const { destIp, sourceIp, category, subcategory, malwareHash, malwareUrl, priority } = theCase
    .connector.fields as ServiceNowSIRFieldsType;
  return {
    dest_ip: destIp,
    source_ip: sourceIp,
    category,
    subcategory,
    malware_hash: malwareHash,
    malware_url: malwareUrl,
    priority,
  };
};

export const serviceNowSIRExternalServiceFormatter: ExternalServiceFormatter<ExternalServiceParams> = {
  format,
};
