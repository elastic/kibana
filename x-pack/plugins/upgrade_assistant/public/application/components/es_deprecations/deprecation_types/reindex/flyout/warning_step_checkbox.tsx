/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import {
  EuiCheckbox,
  EuiCode,
  EuiLink,
  EuiSpacer,
  EuiText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIconTip,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { DocLinksStart } from 'kibana/public';
import { ReindexWarning, ReindexWarningTypes } from '../../../../../../../common/types';

export const hasReindexWarning = (
  warnings: ReindexWarning[],
  warningType: ReindexWarningTypes
): boolean => {
  return Boolean(warnings.find((warning) => warning.warningType === warningType));
};

const WarningCheckbox: React.FunctionComponent<{
  isChecked: boolean;
  warningId: string;
  label: React.ReactNode;
  description: React.ReactNode;
  documentationUrl?: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}> = ({ isChecked, warningId, label, onChange, description, documentationUrl }) => (
  <>
    <EuiText>
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          <EuiCheckbox
            id={warningId}
            label={<strong>{label}</strong>}
            checked={isChecked}
            onChange={onChange}
          />
        </EuiFlexItem>
        {documentationUrl !== undefined && (
          <EuiFlexItem grow={false}>
            <EuiLink href={documentationUrl} target="_blank" external={false}>
              <EuiIconTip
                content={
                  <FormattedMessage
                    id="xpack.upgradeAssistant.checkupTab.reindexing.flyout.warningsStep.documentationLinkLabel"
                    defaultMessage="Documentation"
                  />
                }
                position="right"
                type="help"
              />
            </EuiLink>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>

      <EuiSpacer size="xs" />

      {description}
    </EuiText>

    <EuiSpacer />
  </>
);

export interface WarningCheckboxProps {
  isChecked: boolean;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  docLinks: DocLinksStart['links'];
  id: string;
  meta?: ReindexWarning['meta'];
}

export const CustomTypeNameWarningCheckbox: React.FunctionComponent<WarningCheckboxProps> = ({
  isChecked,
  onChange,
  docLinks,
  id,
  meta,
}) => {
  return (
    <WarningCheckbox
      isChecked={isChecked}
      onChange={onChange}
      warningId={id}
      label={
        <FormattedMessage
          id="xpack.upgradeAssistant.checkupTab.reindexing.flyout.warningsStep.customTypeNameWarningTitle"
          defaultMessage="Replace mapping type {mappingType} with {defaultType}"
          values={{
            mappingType: <EuiCode>{meta!.typeName as string}</EuiCode>,
            defaultType: <EuiCode>_doc</EuiCode>,
          }}
        />
      }
      description={
        <FormattedMessage
          id="xpack.upgradeAssistant.checkupTab.reindexing.flyout.warningsStep.customTypeNameWarningDetail"
          defaultMessage="Mapping types are no longer supported in Elastic 8.x. Ensure no application code or scripts rely on {mappingType}."
          values={{
            mappingType: <EuiCode>{meta!.typeName as string}</EuiCode>,
          }}
        />
      }
      documentationUrl={docLinks.elasticsearch.typesRemoval}
    />
  );
};

export const DeprecatedSettingWarningCheckbox: React.FunctionComponent<WarningCheckboxProps> = ({
  isChecked,
  onChange,
  docLinks,
  id,
  meta,
}) => {
  return (
    <WarningCheckbox
      isChecked={isChecked}
      onChange={onChange}
      warningId={id}
      label={
        <FormattedMessage
          id="xpack.upgradeAssistant.checkupTab.reindexing.flyout.warningsStep.deprecatedIndexSettingsWarningTitle"
          defaultMessage="Remove deprecated index settings"
        />
      }
      description={
        <>
          <FormattedMessage
            id="xpack.upgradeAssistant.checkupTab.reindexing.flyout.warningsStep.deprecatedIndexSettingsWarningDetail"
            defaultMessage="The following deprecated index settings were detected:"
          />

          <EuiSpacer size="xs" />

          <ul>
            {(meta!.deprecatedSettings as string[]).map((setting, index) => {
              return (
                <li key={`${setting}-${index}`}>
                  <EuiCode>{setting}</EuiCode>
                </li>
              );
            })}
          </ul>
        </>
      }
      documentationUrl={docLinks.elasticsearch.indexModules}
    />
  );
};

export const ReplaceIndexWithAliasWarningCheckbox: React.FunctionComponent<
  WarningCheckboxProps
> = ({ isChecked, onChange, docLinks, id, meta }) => {
  return (
    <WarningCheckbox
      isChecked={isChecked}
      onChange={onChange}
      warningId={id}
      label={
        <FormattedMessage
          id="xpack.upgradeAssistant.checkupTab.reindexing.flyout.warningsStep.replaceIndexWithAliasWarningTitle"
          defaultMessage="Replace {indexName} index with {reindexName} index and create {indexName} index alias"
          values={{
            indexName: <EuiCode>{meta?.indexName}</EuiCode>,
            reindexName: <EuiCode>{meta?.reindexName}</EuiCode>,
          }}
        />
      }
      description={
        <FormattedMessage
          id="xpack.upgradeAssistant.checkupTab.reindexing.flyout.warningsStep.replaceIndexWithAliasWarningDetail"
          defaultMessage="You can search {indexName} as before. To delete the data you'll have to delete {reindexName}"
          values={{
            indexName: <EuiCode>{meta?.indexName}</EuiCode>,
            reindexName: <EuiCode>{meta?.reindexName}</EuiCode>,
          }}
        />
      }
    />
  );
};
