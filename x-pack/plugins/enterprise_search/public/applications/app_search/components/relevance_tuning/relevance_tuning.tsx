/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';

import { useActions, useValues } from 'kea';

import { EuiPageHeader, EuiSpacer, EuiFlexGroup, EuiFlexItem, EuiButton } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { FlashMessages } from '../../../shared/flash_messages';
import { SetAppSearchChrome as SetPageChrome } from '../../../shared/kibana_chrome';

import { RELEVANCE_TUNING_TITLE } from './constants';
import { RelevanceTuningForm } from './relevance_tuning_form';
import { RelevanceTuningLogic } from './relevance_tuning_logic';

interface Props {
  engineBreadcrumb: string[];
}

export const RelevanceTuning: React.FC<Props> = ({ engineBreadcrumb }) => {
  const { resetSearchSettings, initializeRelevanceTuning, updateSearchSettings } = useActions(
    RelevanceTuningLogic
  );
  const { engineHasSchemaFields } = useValues(RelevanceTuningLogic);

  useEffect(() => {
    initializeRelevanceTuning();
  }, []);

  return (
    <>
      <SetPageChrome trail={[...engineBreadcrumb, RELEVANCE_TUNING_TITLE]} />
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

      <EuiSpacer />
      <FlashMessages />
      <EuiFlexGroup>
        <EuiFlexItem>
          <RelevanceTuningForm />
        </EuiFlexItem>
        <EuiFlexItem />
      </EuiFlexGroup>
    </>
  );
};
