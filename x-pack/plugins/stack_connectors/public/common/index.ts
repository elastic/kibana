/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getReactComponentLogo } from '@kbn/ai-service-providers';

export { GEMINI_CONNECTOR_ID } from '../../common/gemini/constants';
export const GeminiLogo = getReactComponentLogo('gemini');

export { OPENAI_CONNECTOR_ID, OpenAiProviderType } from '../../common/openai/constants';
export const OpenAILogo = getReactComponentLogo('openai');

export { BEDROCK_CONNECTOR_ID } from '../../common/bedrock/constants';
export const BedrockLogo = getReactComponentLogo('bedrock');

import SentinelOneLogo from '../connector_types/sentinelone/logo';

export { SENTINELONE_CONNECTOR_ID, SUB_ACTION } from '../../common/sentinelone/constants';
export { SentinelOneLogo };

import CrowdstrikeLogo from '../connector_types/crowdstrike/logo';

export {
  CROWDSTRIKE_CONNECTOR_ID,
  SUB_ACTION as CROWDSTRIKE_SUB_ACTION,
} from '../../common/crowdstrike/constants';
export { CrowdstrikeLogo };
