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
  EuiTextColor,
  EuiButtonEmpty,
} from '@elastic/eui';
import { get } from 'lodash';
import { FormattedMessage } from '@kbn/i18n/react';

import { ToggleField, UseField, useFormData } from '../../../../../shared_imports';
import { i18nTexts } from '../../i18n_texts';

import { ActiveHighlight, MinAgeField } from './shared_fields';

interface Props {
  phase: 'hot' | 'warm' | 'cold';
  watchPaths?: string[];
}

export const Phase: FunctionComponent<Props> = ({ children, phase, watchPaths = [] }) => {
  const enabledPath = `_meta.${phase}.enabled`;
  const [formData] = useFormData({
    watch: [...watchPaths, enabledPath],
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
          <EuiFlexGroup>
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
                          'aria-controls': `${phase}PhaseContent`,
                          showLabel: false,
                        },
                      }}
                    />
                  </EuiFlexItem>
                )}
                <EuiFlexItem grow={false}>
                  <EuiTitle size={'s'}>
                    <h3>{i18nTexts.editPolicy.titles[phase]}</h3>
                  </EuiTitle>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
            {enabled && (
              <EuiFlexItem>
                <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" gutterSize={'xs'}>
                  <EuiFlexItem>{phase !== 'hot' && <MinAgeField phase={phase} />}</EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiButtonEmpty
                      onClick={() => {
                        setShowingSettings(!isShowingSettings);
                      }}
                      size="xs"
                      iconType="controlsVertical"
                      iconSide="left"
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
          {isShowingSettings && enabled ? (
            children
          ) : (
            <EuiText color="subdued" size={'s'}>
              {i18nTexts.editPolicy.descriptions[phase]}
              <br />
              <FormattedMessage
                id="xpack.indexLifecycleMgmt.editPolicy.warmPhase.warmPhaseOptionsList"
                defaultMessage="Available options: {list}"
                values={{
                  list: (
                    <EuiTextColor color="default">
                      {i18nTexts.editPolicy.options[phase]}
                    </EuiTextColor>
                  ),
                }}
              />
            </EuiText>
          )}
        </EuiPanel>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
