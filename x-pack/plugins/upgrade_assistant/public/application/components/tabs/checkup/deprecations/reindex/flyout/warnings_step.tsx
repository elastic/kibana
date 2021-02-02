/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';

import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiCheckbox,
  EuiCode,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiLink,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { useAppContext } from '../../../../../../app_context';
import { ReindexWarning } from '../../../../../../../../common/types';

interface CheckedIds {
  [id: string]: boolean;
}

export const idForWarning = (warning: ReindexWarning) => `reindexWarning-${warning}`;

const WarningCheckbox: React.FunctionComponent<{
  checkedIds: CheckedIds;
  warning: ReindexWarning;
  label: React.ReactNode;
  description: React.ReactNode;
  documentationUrl: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}> = ({ checkedIds, warning, label, onChange, description, documentationUrl }) => (
  <>
    <EuiText>
      <EuiCheckbox
        id={idForWarning(warning)}
        label={<strong>{label}</strong>}
        checked={checkedIds[idForWarning(warning)]}
        onChange={onChange}
      />
      <p className="upgWarningsStep__warningDescription">
        {description}
        <br />
        <EuiLink href={documentationUrl} target="_blank" external>
          <FormattedMessage
            id="xpack.upgradeAssistant.checkupTab.reindexing.flyout.warningsStep.documentationLinkLabel"
            defaultMessage="Documentation"
          />
        </EuiLink>
      </p>
    </EuiText>

    <EuiSpacer />
  </>
);

interface WarningsConfirmationFlyoutProps {
  renderGlobalCallouts: () => React.ReactNode;
  closeFlyout: () => void;
  warnings: ReindexWarning[];
  advanceNextStep: () => void;
}

/**
 * Displays warning text about destructive changes required to reindex this index. The user
 * must acknowledge each change before being allowed to proceed.
 */
export const WarningsFlyoutStep: React.FunctionComponent<WarningsConfirmationFlyoutProps> = ({
  warnings,
  renderGlobalCallouts,
  closeFlyout,
  advanceNextStep,
}) => {
  const [checkedIds, setCheckedIds] = useState<CheckedIds>(
    warnings.reduce((initialCheckedIds, warning) => {
      initialCheckedIds[idForWarning(warning)] = false;
      return initialCheckedIds;
    }, {} as { [id: string]: boolean })
  );

  // Do not allow to proceed until all checkboxes are checked.
  const blockAdvance = Object.values(checkedIds).filter((v) => v).length < warnings.length;

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const optionId = e.target.id;

    setCheckedIds((prev) => ({
      ...prev,
      ...{
        [optionId]: !checkedIds[optionId],
      },
    }));
  };

  const { docLinks } = useAppContext();
  const { ELASTIC_WEBSITE_URL } = docLinks;
  const esDocBasePath = `${ELASTIC_WEBSITE_URL}guide/en/elasticsearch/reference`;
  const observabilityDocBasePath = `${ELASTIC_WEBSITE_URL}guide/en/observability`;

  // TODO: Revisit warnings returned for 8.0 upgrade; many of these are likely obselete now
  return (
    <>
      <EuiFlyoutBody>
        {renderGlobalCallouts()}
        <EuiCallOut
          title={
            <FormattedMessage
              id="xpack.upgradeAssistant.checkupTab.reindexing.flyout.warningsStep.destructiveCallout.calloutTitle"
              defaultMessage="This index requires destructive changes that can't be undone"
            />
          }
          color="danger"
          iconType="alert"
        >
          <p>
            <FormattedMessage
              id="xpack.upgradeAssistant.checkupTab.reindexing.flyout.warningsStep.destructiveCallout.calloutDetail"
              defaultMessage="Back up your index, then proceed with the reindex by accepting each breaking change."
            />
          </p>
        </EuiCallOut>

        <EuiSpacer />

        {warnings.includes(ReindexWarning.allField) && (
          <WarningCheckbox
            checkedIds={checkedIds}
            onChange={onChange}
            warning={ReindexWarning.allField}
            label={
              <FormattedMessage
                id="xpack.upgradeAssistant.checkupTab.reindexing.flyout.warningsStep.allFieldWarningTitle"
                defaultMessage="{allField} will be removed"
                values={{
                  allField: <EuiCode>_all</EuiCode>,
                }}
              />
            }
            description={
              <FormattedMessage
                id="xpack.upgradeAssistant.checkupTab.reindexing.flyout.warningsStep.allFieldWarningDetail"
                defaultMessage="The {allField} meta field is no longer supported in 7.0. Reindexing removes
                      the {allField} field in the new index. Ensure that no application code or scripts reply on
                      this field."
                values={{
                  allField: <EuiCode>_all</EuiCode>,
                }}
              />
            }
            documentationUrl={`${esDocBasePath}/6.0/breaking_60_mappings_changes.html#_the_literal__all_literal_meta_field_is_now_disabled_by_default`}
          />
        )}

        {warnings.includes(ReindexWarning.apmReindex) && (
          <WarningCheckbox
            checkedIds={checkedIds}
            onChange={onChange}
            warning={ReindexWarning.apmReindex}
            label={
              <FormattedMessage
                id="xpack.upgradeAssistant.checkupTab.reindexing.flyout.warningsStep.apmReindexWarningTitle"
                defaultMessage="This index will be converted to ECS format"
              />
            }
            description={
              <FormattedMessage
                id="xpack.upgradeAssistant.checkupTab.reindexing.flyout.warningsStep.apmReindexWarningDetail"
                defaultMessage="Starting in version 7.0.0, APM data will be represented in the Elastic Common Schema.
                      Historical APM data will not visible until it's reindexed."
              />
            }
            documentationUrl={`${observabilityDocBasePath}/master/whats-new.html`}
          />
        )}

        {warnings.includes(ReindexWarning.booleanFields) && (
          <WarningCheckbox
            checkedIds={checkedIds}
            onChange={onChange}
            warning={ReindexWarning.booleanFields}
            label={
              <FormattedMessage
                id="xpack.upgradeAssistant.checkupTab.reindexing.flyout.warningsStep.booleanFieldsWarningTitle"
                defaultMessage="Boolean data in {_source} might change"
                values={{ _source: <EuiCode>_source</EuiCode> }}
              />
            }
            description={
              <FormattedMessage
                id="xpack.upgradeAssistant.checkupTab.reindexing.flyout.warningsStep.booleanFieldsWarningDetail"
                defaultMessage="If a document contain a boolean field that is neither {true} or {false}
                   (for example, {yes}, {on}, {one}), reindexing converts these fields to {true} or {false}.
                   Ensure that no application code or scripts rely on boolean fields in the deprecated format."
                values={{
                  true: <EuiCode>true</EuiCode>,
                  false: <EuiCode>false</EuiCode>,
                  yes: <EuiCode>&quot;yes&quot;</EuiCode>,
                  on: <EuiCode>&quot;on&quot;</EuiCode>,
                  one: <EuiCode>1</EuiCode>,
                }}
              />
            }
            documentationUrl={`${esDocBasePath}/6.0/breaking_60_mappings_changes.html#_coercion_of_boolean_field`}
          />
        )}
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty iconType="cross" onClick={closeFlyout} flush="left">
              <FormattedMessage
                id="xpack.upgradeAssistant.checkupTab.reindexing.flyout.checklistStep.cancelButtonLabel"
                defaultMessage="Cancel"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton fill color="danger" onClick={advanceNextStep} disabled={blockAdvance}>
              <FormattedMessage
                id="xpack.upgradeAssistant.checkupTab.reindexing.flyout.checklistStep.continueButtonLabel"
                defaultMessage="Continue with reindex"
              />
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </>
  );
};
