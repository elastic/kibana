/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiCallOut, EuiSpacer, EuiLink, EuiTitle, EuiText } from '@elastic/eui';
import { useAppContext } from '../../../../../../app_context';
import { ReindexWarning, ReindexWarningTypes } from '../../../../../../../../common/types';
import { CustomTypeNameWarningCheckbox } from './custom_type_name_checkbox';
import { DeprecatedSettingsWarningCheckbox } from './deprecated_settings_checkbox';
import { CheckboxProps } from './types';

const i18nTexts = {
  sectionTitle: i18n.translate(
    'xpack.upgradeAssistant.esDeprecations.reindexing.destructiveActions.title',
    { defaultMessage: 'Confirm the following changes' }
  ),
  sectionDescription: i18n.translate(
    'xpack.upgradeAssistant.esDeprecations.reindexing.destructiveActions.description',
    {
      defaultMessage:
        'This index requires destructive changes that cannot be reversed. Back up the index before continuing. To proceed with the reindex, accept each change.',
    }
  ),
};

interface Props {
  warnings: ReindexWarning[];
}

interface CheckedIds {
  [id: string]: boolean;
}

const idForWarning = (id: number) => `reindexWarning-${id}`;

const warningToComponentMap: {
  [key in ReindexWarningTypes]: React.FunctionComponent<CheckboxProps>;
} = {
  customTypeName: CustomTypeNameWarningCheckbox,
  indexSetting: DeprecatedSettingsWarningCheckbox,
};

export const ReindexChangesSection: React.FunctionComponent<Props> = ({ warnings }) => {
  const { docLinks } = useAppContext();

  const [checkedIds, setCheckedIds] = useState<CheckedIds>(
    warnings.reduce((initialCheckedIds, warning, index) => {
      initialCheckedIds[idForWarning(index)] = false;
      return initialCheckedIds;
    }, {} as { [id: string]: boolean })
  );

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const optionId = e.target.id;

    setCheckedIds((prev) => ({
      ...prev,
      ...{
        [optionId]: !checkedIds[optionId],
      },
    }));
  };

  // Do not allow to proceed until all checkboxes are checked.
  // const blockAdvance = Object.values(checkedIds).filter((v) => v).length < warnings.length;

  return (
    <>
      <EuiTitle size="s">
        <h3>{i18nTexts.sectionTitle}</h3>
      </EuiTitle>

      <EuiText>
        <p>{i18nTexts.sectionDescription}</p>
      </EuiText>

      <EuiSpacer size="m" />

      {warnings.map((warning, index) => {
        const Checkbox = warningToComponentMap[warning.warningType];
        return (
          <Checkbox
            key={idForWarning(index)}
            isChecked={checkedIds[idForWarning(index)]}
            onChange={onChange}
            docLinks={docLinks.links}
            id={idForWarning(index)}
            meta={warning.meta}
          />
        );
      })}
    </>
  );
};
