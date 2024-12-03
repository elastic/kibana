/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import type { EuiTextProps } from '@elastic/eui';
import { EuiBetaBadge, EuiFlexGroup, EuiFlexItem, EuiIconTip, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { useTestIdGenerator } from '../../../../../management/hooks/use_test_id_generator';
import { AgentTypeVendorLogo } from '../agent_type_vendor_logo';
import {
  getAgentTypeName,
  TECHNICAL_PREVIEW,
  TECHNICAL_PREVIEW_TOOLTIP,
} from '../../../../translations';
import type { ResponseActionAgentType } from '../../../../../../common/endpoint/service/response_actions/constants';

export const INTEGRATION_SECTION_LABEL = i18n.translate(
  'xpack.securitySolution.agentTypeIntegration.integrationSectionLabel',
  { defaultMessage: 'Integration' }
);

/**
 * Shows the vendor Icon and name associated with an agent type
 */
export interface AgentTypeIntegrationProps {
  agentType: ResponseActionAgentType;
  textSize?: EuiTextProps['size'];
  /**
   * If content should be shown vertically (label and integration name on separate lines) or horizontally (next to each other).
   * Defaults to `vertical`
   */
  layout?: 'vertical' | 'horizontal';
  'data-test-subj'?: string;
}

export const AgentTypeIntegration = memo<AgentTypeIntegrationProps>(
  ({ agentType, textSize = 's', layout = 'vertical', 'data-test-subj': dataTestSubj }) => {
    const testId = useTestIdGenerator(dataTestSubj);

    const isTechPreview = useMemo(() => {
      return agentType === 'sentinel_one' || agentType === 'crowdstrike';
    }, [agentType]);

    return (
      <EuiFlexGroup
        direction={layout === 'horizontal' ? 'row' : 'column'}
        gutterSize="s"
        data-test-subj={testId()}
      >
        <EuiFlexItem grow={false}>
          <EuiText color="subdued" size={textSize} data-test-subj={testId('label')}>
            {INTEGRATION_SECTION_LABEL}&nbsp;
            <EuiIconTip
              content={
                <FormattedMessage
                  id="xpack.securitySolution.responder.header.integrationSectionLabelTooltip"
                  defaultMessage="The integration used to execute response actions on this host"
                />
              }
              position={layout === 'horizontal' ? 'bottom' : 'right'}
              anchorProps={{ 'data-test-subj': testId('tooltipAnchor') }}
            />
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup responsive={false} wrap={false} gutterSize="xs" alignItems="center">
            <EuiFlexItem grow={false}>
              <AgentTypeVendorLogo agentType={agentType} data-test-subj={testId('vendorLogo')} />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText size={textSize} data-test-subj={testId('name')}>
                {getAgentTypeName(agentType)}
              </EuiText>
            </EuiFlexItem>
            {isTechPreview && (
              <EuiFlexItem grow={false}>
                <EuiBetaBadge
                  label={TECHNICAL_PREVIEW}
                  tooltipContent={TECHNICAL_PREVIEW_TOOLTIP}
                  iconType="beaker"
                  size="s"
                  data-test-subj={testId('betaBadge')}
                />
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);
AgentTypeIntegration.displayName = 'AgentTypeIntegration';
