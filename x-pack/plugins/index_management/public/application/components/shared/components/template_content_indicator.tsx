/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiBadge, EuiToolTip } from '@elastic/eui';

interface Props {
  mappings: boolean;
  settings: boolean;
  aliases: boolean;
  contentWhenEmpty?: JSX.Element | null;
}

const texts = {
  settings: i18n.translate('xpack.idxMgmt.templateContentIndicator.indexSettingsTooltipLabel', {
    defaultMessage: 'Index settings',
  }),
  mappings: i18n.translate('xpack.idxMgmt.templateContentIndicator.mappingsTooltipLabel', {
    defaultMessage: 'Mappings',
  }),
  aliases: i18n.translate('xpack.idxMgmt.templateContentIndicator.aliasesTooltipLabel', {
    defaultMessage: 'Aliases',
  }),
};

export const TemplateContentIndicator = ({
  mappings,
  settings,
  aliases,
  contentWhenEmpty = null,
}: Props) => {
  const getColor = (flag: boolean) => (flag ? 'primary' : 'hollow');

  if (!mappings && !settings && !aliases) {
    return contentWhenEmpty;
  }

  return (
    <>
      <EuiToolTip content={texts.mappings}>
        <>
          <EuiBadge color={getColor(mappings)}>M</EuiBadge>
          &nbsp;
        </>
      </EuiToolTip>
      <EuiToolTip content={texts.settings}>
        <>
          <EuiBadge color={getColor(settings)}>S</EuiBadge>
          &nbsp;
        </>
      </EuiToolTip>
      <EuiToolTip content={texts.aliases}>
        <EuiBadge color={getColor(aliases)}>A</EuiBadge>
      </EuiToolTip>
    </>
  );
};
