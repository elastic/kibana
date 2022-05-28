/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useValues } from 'kea';

import { EuiCallOut, EuiLink } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { EuiLinkTo } from '../../../shared/react_router_helpers';
import { META_ENGINES_DOCS_URL, ENGINE_SCHEMA_PATH } from '../../routes';
import { EngineLogic, generateEnginePath } from '../engine';

import { RelevanceTuningLogic } from '.';

export const RelevanceTuningCallouts: React.FC = () => {
  const { schemaFieldsWithConflicts } = useValues(RelevanceTuningLogic);
  const {
    engine: { invalidBoosts, unsearchedUnconfirmedFields },
  } = useValues(EngineLogic);

  const schemaFieldsWithConflictsCount = schemaFieldsWithConflicts.length;

  const invalidBoostsCallout = () => (
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
  );

  const unsearchedUnconfirmedFieldsCallout = () => (
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
  );

  const schemaFieldsWithConflictsCallout = () => (
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
            <EuiLink href={META_ENGINES_DOCS_URL} target="_blank">
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
  );

  return (
    <>
      {invalidBoosts && invalidBoostsCallout()}
      {unsearchedUnconfirmedFields && unsearchedUnconfirmedFieldsCallout()}
      {schemaFieldsWithConflictsCount > 0 && schemaFieldsWithConflictsCallout()}
    </>
  );
};
