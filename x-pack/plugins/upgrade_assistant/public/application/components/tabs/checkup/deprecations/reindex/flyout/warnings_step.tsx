/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
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

  const { docLinks, kibanaVersionInfo } = useAppContext();
  const { ELASTIC_WEBSITE_URL, DOC_LINK_VERSION } = docLinks;
  const esDocBasePath = `${ELASTIC_WEBSITE_URL}guide/en/elasticsearch/reference`;

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

        {kibanaVersionInfo.currentMajor === 7 && warnings.includes(ReindexWarning.customTypeName) && (
          <WarningCheckbox
            checkedIds={checkedIds}
            onChange={onChange}
            warning={ReindexWarning.customTypeName}
            label={
              <FormattedMessage
                id="xpack.upgradeAssistant.checkupTab.reindexing.flyout.warningsStep.customTypeNameWarningTitle"
                defaultMessage="Mapping type will be changed to {defaultType}"
                values={{
                  defaultType: <EuiCode>_doc</EuiCode>,
                }}
              />
            }
            description={
              <FormattedMessage
                id="xpack.upgradeAssistant.checkupTab.reindexing.flyout.warningsStep.customTypeNameWarningDetail"
                defaultMessage="Mapping types are no longer supported in 8.0. This index mapping does not use the
                    default type name, {defaultType}. Ensure no application code or scripts rely on a different type."
                values={{
                  defaultType: <EuiCode>_doc</EuiCode>,
                }}
              />
            }
            documentationUrl={`${esDocBasePath}/${DOC_LINK_VERSION}/removal-of-types.html`}
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
