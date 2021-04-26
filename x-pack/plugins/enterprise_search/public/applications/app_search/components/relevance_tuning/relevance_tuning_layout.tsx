/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useActions, useValues } from 'kea';

import { EuiPageHeader, EuiButton } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { SAVE_BUTTON_LABEL } from '../../../shared/constants';
import { FlashMessages } from '../../../shared/flash_messages';
import { SetAppSearchChrome as SetPageChrome } from '../../../shared/kibana_chrome';
import { RESTORE_DEFAULTS_BUTTON_LABEL } from '../../constants';
import { getEngineBreadcrumbs } from '../engine';

import { RELEVANCE_TUNING_TITLE } from './constants';
import { RelevanceTuningCallouts } from './relevance_tuning_callouts';
import { RelevanceTuningLogic } from './relevance_tuning_logic';

export const RelevanceTuningLayout: React.FC = ({ children }) => {
  const { resetSearchSettings, updateSearchSettings } = useActions(RelevanceTuningLogic);
  const { engineHasSchemaFields } = useValues(RelevanceTuningLogic);

  const pageHeader = () => (
    <EuiPageHeader
      className="relevanceTuningHeader"
      pageTitle={RELEVANCE_TUNING_TITLE}
      description={i18n.translate(
        'xpack.enterpriseSearch.appSearch.engine.relevanceTuning.description',
        {
          defaultMessage: 'Set field weights and boosts.',
        }
      )}
      rightSideItems={
        engineHasSchemaFields
          ? [
              <EuiButton
                data-test-subj="SaveRelevanceTuning"
                color="primary"
                fill
                onClick={updateSearchSettings}
              >
                {SAVE_BUTTON_LABEL}
              </EuiButton>,
              <EuiButton
                data-test-subj="ResetRelevanceTuning"
                color="danger"
                onClick={resetSearchSettings}
              >
                {RESTORE_DEFAULTS_BUTTON_LABEL}
              </EuiButton>,
            ]
          : []
      }
    />
  );

  return (
    <>
      <SetPageChrome trail={getEngineBreadcrumbs([RELEVANCE_TUNING_TITLE])} />
      {pageHeader()}
      <FlashMessages />
      <RelevanceTuningCallouts />
      {children}
    </>
  );
};
