/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent } from 'react';
import moment from 'moment-timezone';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { css } from '@emotion/react';
import {
  EuiCodeBlock,
  EuiLink,
  EuiFlexItem,
  EuiFlexGroup,
  EuiPanel,
  EuiText,
  EuiSpacer,
  EuiDescriptionList,
  EuiBadgeProps,
  EuiBadge,
  EuiCode,
} from '@elastic/eui';
import { euiThemeVars } from '@kbn/ui-theme';

import { ApplicationStart } from '@kbn/core/public';
import { Index, IndexDetailsTab } from '@kbn/index-management';
import { IlmExplainLifecycleLifecycleExplainManaged } from '@elastic/elasticsearch/lib/api/types';
import { Phase } from '../../../common/types';
import { getPolicyEditPath } from '../../application/services/navigation';

const phaseToBadgeMapping: Record<Phase, { color: EuiBadgeProps['color']; label: string }> = {
  hot: {
    color: euiThemeVars.euiColorVis9,
    label: 'Hot',
  },
  warm: {
    color: euiThemeVars.euiColorVis5,
    label: 'Warm',
  },
  cold: {
    color: euiThemeVars.euiColorVis1,
    label: 'Cold',
  },
  frozen: {
    color: euiThemeVars.euiColorVis4,
    label: 'Frozen',
  },
  delete: {
    color: 'default',
    label: 'Delete',
  },
};

interface Props {
  index: Index;
  getUrlForApp: ApplicationStart['getUrlForApp'];
}

export const IndexLifecycleSummary: FunctionComponent<Props> = ({ index, getUrlForApp }) => {
  const { ilm: ilmData } = index;
  // only ILM managed indices render the ILM tab
  const ilm = ilmData as IlmExplainLifecycleLifecycleExplainManaged;

  // if ilm.phase is an unexpected value, then display a default badge
  const phaseBadgeConfig = phaseToBadgeMapping[ilm.phase as Phase] ?? {
    color: 'default',
    label: ilm.phase,
  };
  const lifecycleProperties = [
    {
      title: i18n.translate(
        'xpack.indexLifecycleMgmt.indexLifecycleMgmtSummary.headers.policyNameTitle',
        {
          defaultMessage: 'Policy name',
        }
      ),
      description: ilm.policy,
    },
    {
      title: i18n.translate(
        'xpack.indexLifecycleMgmt.indexLifecycleMgmtSummary.headers.currentPhaseTitle',
        {
          defaultMessage: 'Current phase',
        }
      ),
      description: <EuiBadge color={phaseBadgeConfig.color}>{phaseBadgeConfig.label}</EuiBadge>,
    },
  ];
  if (ilm.action) {
    lifecycleProperties.push({
      title: i18n.translate(
        'xpack.indexLifecycleMgmt.indexLifecycleMgmtSummary.headers.currentActionTitle',
        {
          defaultMessage: 'Current action',
        }
      ),
      description: <EuiCode>{ilm.action}</EuiCode>,
    });
  }
  if (ilm.action_time_millis) {
    lifecycleProperties.push({
      title: i18n.translate(
        'xpack.indexLifecycleMgmt.indexLifecycleMgmtSummary.headers.currentActionTimeTitle',
        {
          defaultMessage: 'Current action time',
        }
      ),
      description: moment(ilm.action_time_millis).format('YYYY-MM-DD HH:mm:ss'),
    });
  }
  if (ilm.step) {
    lifecycleProperties.push({
      title: i18n.translate(
        'xpack.indexLifecycleMgmt.indexLifecycleMgmtSummary.headers.currentStepTitle',
        {
          defaultMessage: 'Current step',
        }
      ),
      description: <EuiCode>{ilm.step}</EuiCode>,
    });
  }
  return (
    <>
      <EuiFlexGroup wrap>
        <EuiFlexItem
          grow={1}
          css={css`
            min-width: 400px;
          `}
        >
          <EuiPanel hasBorder={true} grow={false} data-test-subj="policyPropertiesPanel">
            <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
              <EuiFlexItem grow={false}>
                <EuiText size="xs">
                  <h3>
                    <FormattedMessage
                      defaultMessage="Lifecycle policy"
                      id="xpack.indexLifecycleMgmt.indexLifecycleMgmtSummary.policyCardTitle"
                    />
                  </h3>
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiLink
                  color="primary"
                  href={getUrlForApp('management', {
                    path: `data/index_lifecycle_management/${getPolicyEditPath(ilm.policy)}`,
                  })}
                  target="_blank"
                >
                  <FormattedMessage
                    defaultMessage="Edit policy in ILM"
                    id="xpack.indexLifecycleMgmt.indexLifecycleMgmtSummary.ilmLinkLabel"
                  />
                </EuiLink>
              </EuiFlexItem>
            </EuiFlexGroup>

            <EuiSpacer />
            <EuiDescriptionList
              rowGutterSize="m"
              type="responsiveColumn"
              columnWidths={[1, 1]}
              listItems={lifecycleProperties}
            />
          </EuiPanel>
        </EuiFlexItem>
        <EuiFlexItem
          grow={3}
          css={css`
            min-width: 600px;
          `}
        >
          {ilm.step_info && ilm.step === 'ERROR' && (
            // there is an error
            <>
              <EuiPanel
                color="danger"
                hasBorder={true}
                grow={false}
                data-test-subj="policyErrorPanel"
              >
                <EuiText size="xs">
                  <h3>
                    <FormattedMessage
                      defaultMessage="Lifecycle error"
                      id="xpack.indexLifecycleMgmt.indexLifecycleMgmtSummary.lifecycleErrorTitle"
                    />
                  </h3>
                  <EuiSpacer />
                  <EuiCodeBlock language="json" isCopyable>
                    {JSON.stringify(
                      { failed_step: ilm.failed_step, step_info: ilm.step_info },
                      null,
                      2
                    )}
                  </EuiCodeBlock>
                </EuiText>
              </EuiPanel>
              <EuiSpacer />
            </>
          )}
          {ilm.step_info && ilm.step !== 'ERROR' && (
            // ILM is waiting for the step to complete
            <>
              <EuiPanel hasBorder={true} grow={false} data-test-subj="policyStepPanel">
                <EuiText size="xs">
                  <h3>
                    <FormattedMessage
                      defaultMessage="Current step info"
                      id="xpack.indexLifecycleMgmt.indexLifecycleMgmtSummary.stepInfoTitle"
                    />
                  </h3>
                  <EuiSpacer />
                  <EuiCodeBlock language="json" isCopyable>
                    {JSON.stringify(ilm.step_info, null, 2)}
                  </EuiCodeBlock>
                </EuiText>
              </EuiPanel>
              <EuiSpacer />
            </>
          )}
          {ilm.phase_execution && (
            <EuiPanel hasBorder={true} grow={false} data-test-subj="phaseDefinitionPanel">
              <EuiText size="xs">
                <h3>
                  <FormattedMessage
                    defaultMessage="Current phase definition"
                    id="xpack.indexLifecycleMgmt.indexLifecycleMgmtSummary.phaseDefinitionTitle"
                  />
                </h3>
              </EuiText>
              <EuiSpacer />
              <EuiCodeBlock language="json" isCopyable>
                {JSON.stringify(ilm.phase_execution, null, 2)}
              </EuiCodeBlock>
            </EuiPanel>
          )}
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};

export const indexLifecycleTab: IndexDetailsTab = {
  id: 'ilm',
  name: (
    <FormattedMessage
      defaultMessage="Index lifecycle"
      id="xpack.indexLifecycleMgmt.indexLifecycleMgmtSummary.tabHeaderLabel"
    />
  ),
  order: 50,
  renderTabContent: IndexLifecycleSummary,
  shouldRenderTab: ({ index }) => {
    return !!index.ilm && index.ilm.managed;
  },
};
