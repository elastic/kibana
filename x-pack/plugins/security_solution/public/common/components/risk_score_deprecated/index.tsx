/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiEmptyPrompt, EuiPanel, EuiToolTip } from '@elastic/eui';
import React, { useMemo } from 'react';
import { RiskEntity } from '../../../risk_score/containers/feature_status/api';
import { useCheckSignalIndex } from '../../../detections/containers/detection_engine/alerts/use_check_signal_index';
import { HeaderSection } from '../header_section';
import * as i18n from './translations';

export const RiskScoresDeprecated = ({ entityType }: { entityType: RiskEntity }) => {
  const { signalIndexExists } = useCheckSignalIndex();

  const translations = useMemo(
    () => ({
      body: i18n.UPGRADE_RISK_SCORE_DESCRIPTION,
      signal: !signalIndexExists ? i18n.ENABLE_RISK_SCORE_POPOVER : null,
      ...(entityType === RiskEntity.host
        ? {
            header: i18n.HOST_RISK_TITLE,
            cta: i18n.UPGRADE_HOST_RISK_SCORE,
          }
        : {
            header: i18n.USER_RISK_TITLE,
            cta: i18n.UPGRADE_USER_RISK_SCORE,
          }),
    }),
    [entityType, signalIndexExists]
  );

  return (
    <EuiPanel hasBorder>
      <HeaderSection title={<h2>{translations.header}</h2>} titleSize="s" />
      <EuiEmptyPrompt
        title={<h2>{translations.cta}</h2>}
        body={translations.body}
        actions={
          <EuiToolTip content={translations.signal}>
            <EuiButton
              color="primary"
              fill
              onClick={() => alert('Angela do the upgrade')}
              isDisabled={!signalIndexExists}
              data-test-subj={`upgrade_${entityType}_risk_score`}
            >
              {translations.cta}
            </EuiButton>
          </EuiToolTip>
        }
      />
    </EuiPanel>
  );
};
