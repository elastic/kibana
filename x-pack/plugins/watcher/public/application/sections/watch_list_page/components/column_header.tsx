/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiIcon, EuiToolTip } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

interface Props {
  field: string;
  name: string;
  tooltipText: string;
}

export const ColumnHeader: React.FC<Props> = ({ field, name, tooltipText }) => {
  return (
    <EuiToolTip
      content={i18n.translate(
        `xpack.watcher.sections.watchList.watchTable.${field}Header.tooltipText`,
        {
          defaultMessage: tooltipText,
        }
      )}
    >
      <span>
        {i18n.translate(`xpack.watcher.sections.watchList.watchTable.${field}Header`, {
          defaultMessage: name,
        })}{' '}
        <EuiIcon size="s" color="subdued" type="questionInCircle" className="eui-alignTop" />
      </span>
    </EuiToolTip>
  );
};
