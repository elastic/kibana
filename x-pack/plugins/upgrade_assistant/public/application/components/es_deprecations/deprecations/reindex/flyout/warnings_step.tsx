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
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiSpacer,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

import { ReindexWarning, ReindexWarningTypes } from '../../../../../../../common/types';
import { useAppContext } from '../../../../../app_context';
import {
  CustomTypeNameWarningCheckbox,
  DeprecatedSettingWarningCheckbox,
  WarningCheckboxProps,
} from './warning_step_checkbox';

interface CheckedIds {
  [id: string]: boolean;
}

const warningToComponentMap: {
  [key in ReindexWarningTypes]: React.FunctionComponent<WarningCheckboxProps>;
} = {
  customTypeName: CustomTypeNameWarningCheckbox,
  indexSetting: DeprecatedSettingWarningCheckbox,
};

export const idForWarning = (id: number) => `reindexWarning-${id}`;
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
  const { docLinks } = useAppContext();
  const { links } = docLinks;

  const [checkedIds, setCheckedIds] = useState<CheckedIds>(
    warnings.reduce((initialCheckedIds, warning, index) => {
      initialCheckedIds[idForWarning(index)] = false;
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

  return (
    <>
      <EuiFlyoutBody>
        {renderGlobalCallouts()}

        <EuiCallOut
          title={
            <FormattedMessage
              id="xpack.upgradeAssistant.checkupTab.reindexing.flyout.warningsStep.destructiveCallout.calloutTitle"
              defaultMessage="This index requires destructive changes that cannot be reversed"
            />
          }
          color="danger"
          iconType="alert"
        >
          <p>
            <FormattedMessage
              id="xpack.upgradeAssistant.checkupTab.reindexing.flyout.warningsStep.destructiveCallout.calloutDetail"
              defaultMessage="Back up the index before continuing. To proceed with the reindex, accept each change."
            />
          </p>
        </EuiCallOut>

        <EuiSpacer />

        {warnings.map((warning, index) => {
          const WarningCheckbox = warningToComponentMap[warning.warningType];
          return (
            <WarningCheckbox
              key={idForWarning(index)}
              isChecked={checkedIds[idForWarning(index)]}
              onChange={onChange}
              docLinks={links}
              id={idForWarning(index)}
              meta={warning.meta}
            />
          );
        })}
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
