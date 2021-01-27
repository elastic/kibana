/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent, useState } from 'react';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiTitle,
  EuiSpacer,
  EuiText,
  EuiButtonEmpty,
} from '@elastic/eui';
import { get } from 'lodash';
import { FormattedMessage } from '@kbn/i18n/react';

import { ToggleField, UseField, useFormData } from '../../../../../shared_imports';
import { i18nTexts } from '../../i18n_texts';

import { ActiveHighlight } from '../active_highlight';
import { MinAgeField } from './shared_fields';

interface Props {
  phase: 'hot' | 'warm' | 'cold';
}

export const Phase: FunctionComponent<Props> = ({ children, phase }) => {
  const enabledPath = `_meta.${phase}.enabled`;
  const [formData] = useFormData({
    watch: [enabledPath],
  });

  // hot phase is always enabled
  const enabled = get(formData, enabledPath) || phase === 'hot';

  const [isShowingSettings, setShowingSettings] = useState<boolean>(false);
  return (
    <EuiFlexGroup>
      <EuiFlexItem grow={false}>
        <ActiveHighlight phase={phase} enabled={enabled} />
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiPanel hasShadow={enabled}>
          <EuiFlexGroup wrap>
            <EuiFlexItem>
              <EuiFlexGroup alignItems="center" gutterSize={'s'}>
                {phase !== 'hot' && (
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
                  <EuiTitle size={'s'}>
                    <h2>{i18nTexts.editPolicy.titles[phase]}</h2>
                  </EuiTitle>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
            {enabled && (
              <EuiFlexItem>
                <EuiFlexGroup
                  justifyContent="spaceBetween"
                  alignItems="center"
                  gutterSize={'xs'}
                  wrap
                >
                  <EuiFlexItem grow={true}>
                    {phase !== 'hot' && <MinAgeField phase={phase} />}
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiButtonEmpty
                      data-test-subj={`${phase}-settingsSwitch`}
                      onClick={() => {
                        setShowingSettings(!isShowingSettings);
                      }}
                      size="xs"
                      iconType="controlsVertical"
                      iconSide="left"
                      aria-controls={`${phase}-phaseContent`}
                    >
                      <FormattedMessage
                        id="xpack.indexLifecycleMgmt.editPolicy.phaseSettings.buttonLabel"
                        defaultMessage="Settings"
                      />
                    </EuiButtonEmpty>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
          <EuiSpacer />
          <EuiText color="subdued" size={'s'} style={{ maxWidth: '50%' }}>
            {i18nTexts.editPolicy.descriptions[phase]}
          </EuiText>

          {enabled && (
            <div style={isShowingSettings ? {} : { display: 'none' }} id={`${phase}-phaseContent`}>
              <EuiSpacer />
              {children}
            </div>
          )}
        </EuiPanel>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
