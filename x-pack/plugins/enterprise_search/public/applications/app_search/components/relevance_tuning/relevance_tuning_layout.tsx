/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useActions, useValues } from 'kea';

import { EuiPageHeader, EuiSpacer, EuiButton } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { FlashMessages } from '../../../shared/flash_messages';
import { SetAppSearchChrome as SetPageChrome } from '../../../shared/kibana_chrome';

import { RELEVANCE_TUNING_TITLE } from './constants';
import { RelevanceTuningCallouts } from './relevance_tuning_callouts';
import { RelevanceTuningLogic } from './relevance_tuning_logic';

interface Props {
  engineBreadcrumb: string[];
}

export const RelevanceTuningLayout: React.FC<Props> = ({ engineBreadcrumb, children }) => {
  const { resetSearchSettings, updateSearchSettings } = useActions(RelevanceTuningLogic);
  const { engineHasSchemaFields } = useValues(RelevanceTuningLogic);

  const pageHeader = () => (
    <EuiPageHeader
      className="relevanceTuningHeader"
      pageTitle={RELEVANCE_TUNING_TITLE}
      description={i18n.translate(
        'xpack.enterpriseSearch.appSearch.engine.relevanceTuning.description',
        {
          defaultMessage: 'Set field weights and boosts',
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
                {i18n.translate(
                  'xpack.enterpriseSearch.appSearch.engine.relevanceTuning.saveButtonLabel',
                  {
                    defaultMessage: 'Save',
                  }
                )}
              </EuiButton>,
              <EuiButton
                data-test-subj="ResetRelevanceTuning"
                color="danger"
                onClick={resetSearchSettings}
              >
                {i18n.translate(
                  'xpack.enterpriseSearch.appSearch.engine.relevanceTuning.resetButtonLabel',
                  {
                    defaultMessage: 'Restore defaults',
                  }
                )}
              </EuiButton>,
            ]
          : []
      }
    />
  );

  return (
    <>
      <SetPageChrome trail={[...engineBreadcrumb, RELEVANCE_TUNING_TITLE]} />
      {pageHeader()}
      <FlashMessages />
      <RelevanceTuningCallouts />
      <EuiSpacer />
      {children}
    </>
  );
};
