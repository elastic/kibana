/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';

import { useActions, useValues } from 'kea';

import {
  EuiPageHeader,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
  EuiCallOut,
  EuiLink,
  EuiEmptyPrompt,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

import { FlashMessages } from '../../../shared/flash_messages';
import { SetAppSearchChrome as SetPageChrome } from '../../../shared/kibana_chrome';
import { EuiLinkTo } from '../../../shared/react_router_helpers';
import { UnsavedChangesPrompt } from '../../../shared/unsaved_changes_prompt';

import { DOCS_PREFIX, ENGINE_SCHEMA_PATH } from '../../routes';
import { EngineLogic, generateEnginePath } from '../engine';

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
  const { schemaFieldsWithConflicts, engineHasSchemaFields, unsavedChanges } = useValues(
    RelevanceTuningLogic
  );
  const {
    engine: { invalidBoosts, unsearchedUnconfirmedFields },
  } = useValues(EngineLogic);

  const schemaFieldsWithConflictsCount = schemaFieldsWithConflicts.length;

  useEffect(() => {
    initializeRelevanceTuning();
  }, []);

  return (
    <>
      <UnsavedChangesPrompt hasUnsavedChanges={unsavedChanges} />
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

      <FlashMessages />
      {invalidBoosts && (
        <EuiCallOut
          color="warning"
          iconType="alert"
          title={i18n.translate(
            'xpack.enterpriseSearch.appSearch.engine.relevanceTuning.invalidBoostsBannerLabel',
            {
              defaultMessage: 'You have invalid boosts!',
            }
          )}
          data-test-subj="RelevanceTuningInvalidBoostsCallout"
        >
          {i18n.translate(
            'xpack.enterpriseSearch.appSearch.engine.relevanceTuning.invalidBoostsErrorMessage',
            {
              defaultMessage:
                'One or more of your boosts is no longer valid, possibly due to a schema type change. Delete any old or invalid boosts to dismiss this alert.',
            }
          )}
        </EuiCallOut>
      )}
      {unsearchedUnconfirmedFields && (
        <EuiCallOut
          color="warning"
          iconType="alert"
          title={i18n.translate(
            'xpack.enterpriseSearch.appSearch.engine.relevanceTuning.uncofirmedFieldsBannerLabel',
            {
              defaultMessage: 'Recently added fields are not being searched by default',
            }
          )}
          data-test-subj="RelevanceTuningUnsearchedFieldsCallout"
        >
          <FormattedMessage
            id="xpack.enterpriseSearch.appSearch.engine.relevanceTuning.uncofirmedFieldsErrorMessage"
            defaultMessage="If these new fields should be searchable, turn them on here by toggling Text Search. Otherwise, confirm your new {schemaLink} to dismiss this alert."
            values={{
              schemaLink: (
                <EuiLinkTo to={generateEnginePath(ENGINE_SCHEMA_PATH)}>
                  {i18n.translate(
                    'xpack.enterpriseSearch.appSearch.engine.relevanceTuning.schemaFieldsLinkLabel',
                    {
                      defaultMessage: 'schema fields',
                    }
                  )}
                </EuiLinkTo>
              ),
            }}
          />
        </EuiCallOut>
      )}
      {schemaFieldsWithConflictsCount > 0 && (
        <EuiCallOut
          color="warning"
          iconType="alert"
          title={i18n.translate(
            'xpack.enterpriseSearch.appSearch.engine.relevanceTuning.schemaConflictsBannerLabel',
            {
              defaultMessage: 'Disabled fields',
            }
          )}
          data-test-subj="SchemaConflictsCallout"
        >
          <FormattedMessage
            id="xpack.enterpriseSearch.appSearch.engine.relevanceTuning.schemaConflictsErrorMessage"
            defaultMessage="{schemaFieldsWithConflictsCount, number} inactive {schemaFieldsWithConflictsCount, plural, one {field} other {fields}} due to field-type conflicts. {link}"
            values={{
              schemaFieldsWithConflictsCount,
              link: (
                <EuiLink href={`${DOCS_PREFIX}/meta-engines-guide.html`} target="_blank">
                  {i18n.translate(
                    'xpack.enterpriseSearch.appSearch.engine.relevanceTuning.whatsThisLinkLabel',
                    {
                      defaultMessage: "What's this?",
                    }
                  )}
                </EuiLink>
              ),
            }}
          />
        </EuiCallOut>
      )}
      <EuiSpacer />
      {engineHasSchemaFields ? (
        <EuiFlexGroup>
          <EuiFlexItem>
            <RelevanceTuningForm />
          </EuiFlexItem>
          <EuiFlexItem />
        </EuiFlexGroup>
      ) : (
        <EuiEmptyPrompt
          title={
            <h2>
              {i18n.translate(
                'xpack.enterpriseSearch.appSearch.engine.relevanceTuning.emptyErrorMessageTitle',
                {
                  defaultMessage: 'Tuning requires schema fields',
                }
              )}
            </h2>
          }
          body={i18n.translate(
            'xpack.enterpriseSearch.appSearch.engine.relevanceTuning.emptyErrorMessage',
            {
              defaultMessage: 'Index documents to tune relevance.',
            }
          )}
          actions={
            <EuiButton
              size="s"
              color="primary"
              href={`${DOCS_PREFIX}/relevance-tuning-guide.html`}
              fill
            >
              {i18n.translate(
                'xpack.enterpriseSearch.appSearch.engine.relevanceTuning.emptyButtonLabel',
                {
                  defaultMessage: 'Read the relevance tuning guide',
                }
              )}
            </EuiButton>
          }
        />
      )}
    </>
  );
};
