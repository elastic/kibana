import React from 'react';
import type { AgentConfiguration } from '../../../../../../common/agent_configuration/configuration_types';
import type { FetcherResult } from '../../../../../hooks/use_fetcher';
type PageStep = 'choose-service-step' | 'choose-settings-step' | 'review-step';
export declare function AgentConfigurationCreateEdit({ pageStep, existingConfigResult, }: {
    pageStep: PageStep;
    existingConfigResult?: FetcherResult<AgentConfiguration>;
}): React.JSX.Element;
export {};
