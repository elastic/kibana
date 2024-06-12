/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { CROWDSTRIKE_AGENT_ID_FIELD } from '../../../common/utils/crowdstrike_alert_check';
import { SENTINEL_ONE_AGENT_ID_FIELD } from '../../../common/utils/sentinelone_alert_check';

export const NOT_FROM_ENDPOINT_HOST_TOOLTIP = i18n.translate(
  'xpack.securitySolution.endpoint.detections.takeAction.responseActionConsole.notSupportedTooltip',
  {
    defaultMessage: 'Add the Elastic Defend integration via Elastic Agent to enable this feature',
  }
);
export const HOST_ENDPOINT_UNENROLLED_TOOLTIP = i18n.translate(
  'xpack.securitySolution.endpoint.detections.takeAction.responseActionConsole.unenrolledTooltip',
  { defaultMessage: 'Host is no longer enrolled with the Elastic Defend integration' }
);
export const LOADING_ENDPOINT_DATA_TOOLTIP = i18n.translate(
  'xpack.securitySolution.endpoint.detections.takeAction.responseActionConsole.loadingTooltip',
  { defaultMessage: 'Loading' }
);
export const METADATA_API_ERROR_TOOLTIP = i18n.translate(
  'xpack.securitySolution.endpoint.detections.takeAction.responseActionConsole.generalMetadataErrorTooltip',
  { defaultMessage: 'Failed to retrieve Endpoint metadata' }
);

export const SENTINEL_ONE_AGENT_ID_PROPERTY_MISSING = i18n.translate(
  'xpack.securitySolution.endpoint.detections.takeAction.responseActionConsole.missingSentinelOneAgentId',
  {
    defaultMessage: 'Event data missing SentinelOne agent identifier ({field})',
    values: {
      field: SENTINEL_ONE_AGENT_ID_FIELD,
    },
  }
);
export const CROWDSTRIKE_AGENT_ID_PROPERTY_MISSING = i18n.translate(
  'xpack.securitySolution.endpoint.detections.takeAction.responseActionConsole.missingCrowdstrikeAgentId',
  {
    defaultMessage: 'Event data missing Crowdstrike agent identifier ({field})',
    values: {
      field: CROWDSTRIKE_AGENT_ID_FIELD,
    },
  }
);
