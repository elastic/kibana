/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent } from 'react';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
  EuiText,
  EuiComment,
  EuiAccordion,
  EuiSpacer,
} from '@elastic/eui';
import { get } from 'lodash';
import { FormattedMessage } from '@kbn/i18n/react';

import { ToggleField, UseField, useFormData } from '../../../../../shared_imports';
import { i18nTexts } from '../../i18n_texts';
import { FormInternal } from '../../types';

import { MinAgeField } from './shared_fields';

import './phase.scss';
import { PhaseIcon } from '../phase_icon';
import { PhaseFooter } from '../phase_footer';

interface Props {
  phase: 'hot' | 'warm' | 'cold';
}

export const Phase: FunctionComponent<Props> = ({ children, phase }) => {
  const enabledPath = `_meta.${phase}.enabled`;
  const [formData] = useFormData<FormInternal>({
    watch: [enabledPath],
  });

  // hot phase is always enabled
  const enabled = get(formData, enabledPath) || phase === 'hot';

  const phaseTitle = (
    <EuiFlexGroup alignItems="center" gutterSize={'s'} wrap>
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
  );

  const minAge = phase !== 'hot' ? <MinAgeField phase={phase} /> : null;

  return (
    <EuiComment
      username={phaseTitle}
      actions={minAge}
      timelineIcon={<PhaseIcon enabled={enabled} phase={phase} />}
      className={'ilmPhase'}
    >
      <div className="ilmPhase__inner">
        <EuiText color="subdued" size={'s'} style={{ maxWidth: '50%' }}>
          {i18nTexts.editPolicy.descriptions[phase]}
        </EuiText>

        {enabled && (
          <>
            <EuiSpacer size="m" />
            <EuiAccordion
              id={`${phase}-settingsSwitch`}
              buttonContent={
                <FormattedMessage
                  id="xpack.indexLifecycleMgmt.editPolicy.phaseSettings.buttonLabel"
                  defaultMessage="Advanced settings"
                />
              }
              buttonClassName="ilmSettingsButton"
            >
              <EuiSpacer />
              {children}
            </EuiAccordion>
          </>
        )}
      </div>
      <PhaseFooter phase={phase} />
    </EuiComment>
  );
};
