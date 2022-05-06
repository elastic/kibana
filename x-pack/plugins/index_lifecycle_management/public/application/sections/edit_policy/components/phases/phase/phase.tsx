/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent } from 'react';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
  EuiText,
  EuiAccordion,
  EuiSpacer,
  EuiBadge,
  EuiTimelineItem,
  EuiSplitPanel,
  EuiHorizontalRule,
} from '@elastic/eui';
import { get } from 'lodash';
import { FormattedMessage } from '@kbn/i18n-react';

import { PhaseExceptDelete } from '../../../../../../../common/types';
import { ToggleField, useFormData } from '../../../../../../shared_imports';
import { i18nTexts } from '../../../i18n_texts';
import { FormInternal } from '../../../types';
import { UseField } from '../../../form';
import { MinAgeField } from '../shared_fields';
import { PhaseIcon } from '../../phase_icon';
import { PhaseFooter } from '../../phase_footer';
import { PhaseErrorIndicator } from './phase_error_indicator';

import './phase.scss';

interface Props {
  phase: PhaseExceptDelete;
  /**
   * Settings that should always be visible on the phase when it is enabled.
   */
  topLevelSettings?: React.ReactNode;
}

export const Phase: FunctionComponent<Props> = ({ children, topLevelSettings, phase }) => {
  const enabledPath = `_meta.${phase}.enabled`;
  const [formData] = useFormData<FormInternal>({
    watch: [enabledPath],
  });

  const isHotPhase = phase === 'hot';
  // hot phase is always enabled
  const enabled = get(formData, enabledPath) || isHotPhase;

  const phaseTitle = (
    <EuiFlexGroup alignItems="center" gutterSize="s">
      {!isHotPhase && (
        <EuiFlexItem grow={false}>
          <UseField
            path={enabledPath}
            component={ToggleField}
            componentProps={{
              euiFieldProps: {
                'data-test-subj': `enablePhaseSwitch-${phase}`,
                showLabel: false,
              },
            }}
          />
        </EuiFlexItem>
      )}
      <EuiFlexItem grow={false}>
        <EuiTitle size="s">
          <h2>{i18nTexts.editPolicy.titles[phase]}</h2>
        </EuiTitle>
      </EuiFlexItem>
      {isHotPhase && (
        <EuiFlexItem grow={false}>
          <EuiBadge className="ilmPhaseRequiredBadge">
            <FormattedMessage
              id="xpack.indexLifecycleMgmt.editPolicy.phaseTitle.requiredBadge"
              defaultMessage="Required"
            />
          </EuiBadge>
        </EuiFlexItem>
      )}
      <EuiFlexItem grow={false}>
        <PhaseErrorIndicator phase={phase} />
      </EuiFlexItem>
      {!isHotPhase && enabled && (
        <EuiFlexItem grow={true}>
          <MinAgeField phase={phase} />
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );

  return (
    <EuiTimelineItem
      icon={<PhaseIcon enabled={enabled} phase={phase} />}
      verticalAlign="top"
      data-test-subj={`${phase}-phase`}
    >
      <EuiSplitPanel.Outer color="transparent" hasBorder grow>
        <EuiSplitPanel.Inner color={enabled ? 'transparent' : 'subdued'}>
          {phaseTitle}
        </EuiSplitPanel.Inner>
        <EuiHorizontalRule margin="none" />
        <EuiSplitPanel.Inner>
          <EuiText color="subdued" size="s" style={{ maxWidth: '50%' }}>
            {i18nTexts.editPolicy.descriptions[phase]}
          </EuiText>

          {enabled && (
            <>
              {!!topLevelSettings ? (
                <>
                  <EuiSpacer />
                  {topLevelSettings}
                </>
              ) : (
                <EuiSpacer size="m" />
              )}

              {children ? (
                <EuiAccordion
                  id={`${phase}-settingsSwitch`}
                  className="ilmSettingsAccordion"
                  buttonContent={
                    <FormattedMessage
                      id="xpack.indexLifecycleMgmt.editPolicy.phaseSettings.buttonLabel"
                      defaultMessage="Advanced settings"
                    />
                  }
                  buttonClassName="ilmSettingsButton"
                  extraAction={<PhaseFooter phase={phase} />}
                >
                  <EuiSpacer />
                  {children}
                </EuiAccordion>
              ) : (
                <EuiFlexGroup justifyContent="flexEnd">
                  <EuiFlexItem grow={false}>
                    <PhaseFooter phase={phase} />
                  </EuiFlexItem>
                </EuiFlexGroup>
              )}
            </>
          )}
        </EuiSplitPanel.Inner>
      </EuiSplitPanel.Outer>
    </EuiTimelineItem>
  );
};
