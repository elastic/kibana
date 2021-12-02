/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiCodeBlock, EuiCallOut } from '@elastic/eui';
import { IndexSettings } from '../../../../../../common';

interface Props {
  settings: IndexSettings | undefined;
}

export const TabSettings: React.FunctionComponent<Props> = ({ settings }) => {
  if (settings && Object.keys(settings).length) {
    return (
      <div data-test-subj="settingsTabContent">
        <EuiCodeBlock lang="json">{JSON.stringify(settings, null, 2)}</EuiCodeBlock>
      </div>
    );
  }

  return (
    <EuiCallOut
      title={
        <FormattedMessage
          id="xpack.idxMgmt.settingsTab.noIndexSettingsTitle"
          defaultMessage="No settings defined."
        />
      }
      iconType="pin"
      data-test-subj="noSettingsCallout"
      size="s"
    />
  );
};
