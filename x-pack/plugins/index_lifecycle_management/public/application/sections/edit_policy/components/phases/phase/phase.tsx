/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useLocation } from 'react-router-dom';
import React, { FunctionComponent, useState, useEffect } from 'react';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
  EuiText,
  EuiComment,
  EuiAccordion,
  EuiSpacer,
  EuiBadge,
} from '@elastic/eui';
import { get } from 'lodash';
import { FormattedMessage } from '@kbn/i18n/react';

import { PhasesExceptDelete } from '../../../../../../../common/types';
import { ToggleField, useFormData } from '../../../../../../shared_imports';
import { i18nTexts } from '../../../i18n_texts';

import { FormInternal } from '../../../types';

import { UseField } from '../../../form';

import { PhaseErrorIndicator } from './phase_error_indicator';

import { MinAgeField } from '../shared_fields';
import { PhaseIcon } from '../../phase_icon';
import { PhaseFooter } from '../../phase_footer';
import './phase.scss';

interface Props {
  phase: PhasesExceptDelete;
  /**
   * Settings that should always be visible on the phase when it is enabled.
   */
  topLevelSettings?: React.ReactNode;
}

/**
 * To re-orient the user about their place in the form after returning from somewhere else,
 * like the rollup wizard, we want to scroll them back to a specific field. Fields are often hidden
 * inside of an accordion which has an animation when it opens. We need to wait for this animation
 * to complete so that the field is in it's final position before we can start scrolling to it.
 */
const EUI_ACCORDION_EXPAND_DELAY = 500;

export const Phase: FunctionComponent<Props> = ({ children, topLevelSettings, phase }) => {
  const enabledPath = `_meta.${phase}.enabled`;
  const [isAccordionOpen, setIsAccordionOpen] = useState(false);
  const { hash } = useLocation();
  const [formData] = useFormData<FormInternal>({
    watch: [enabledPath],
  });

  const isHotPhase = phase === 'hot';
  // hot phase is always enabled
  const enabled = get(formData, enabledPath) || isHotPhase;

  const phaseTitle = (
    <EuiFlexGroup alignItems="center" gutterSize={'s'} wrap>
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
        <EuiTitle size={'s'}>
          <h2>{i18nTexts.editPolicy.titles[phase]}</h2>
        </EuiTitle>
      </EuiFlexItem>
      {isHotPhase && (
        <EuiFlexItem grow={false}>
          <EuiBadge>
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
    </EuiFlexGroup>
  );

  // @ts-ignore
  const minAge = !isHotPhase && enabled ? <MinAgeField phase={phase} /> : null;

  useEffect(() => {
    if (hash && hash.startsWith(`#${phase}`)) {
      setIsAccordionOpen(true);
      setTimeout(() => {
        const el = document.querySelector(hash);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, EUI_ACCORDION_EXPAND_DELAY);
    }
  }, [hash, phase]);

  return (
    <EuiComment
      username={phaseTitle}
      actions={minAge}
      timelineIcon={<PhaseIcon enabled={enabled} phase={phase} />}
      className={`ilmPhase ${enabled ? 'ilmPhase--enabled' : ''}`}
    >
      <EuiText color="subdued" size={'s'} style={{ maxWidth: '50%' }}>
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

          <EuiAccordion
            id={`${phase}-settingsSwitch`}
            forceState={isAccordionOpen ? 'open' : 'closed'}
            onToggle={() => setIsAccordionOpen((v) => !v)}
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
        </>
      )}
    </EuiComment>
  );
};
