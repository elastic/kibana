/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiCodeBlock, EuiCallOut } from '@elastic/eui';
import { Mappings } from '../../../../../../common';

interface Props {
  mappings: Mappings | undefined;
}

export const TabMappings: React.FunctionComponent<Props> = ({ mappings }) => {
  if (mappings && Object.keys(mappings).length) {
    return (
      <div data-test-subj="mappingsTabContent">
        <EuiCodeBlock lang="json">{JSON.stringify(mappings, null, 2)}</EuiCodeBlock>
      </div>
    );
  }

  return (
    <EuiCallOut
      title={
        <FormattedMessage
          id="xpack.idxMgmt.mappingsTab.noMappingsTitle"
          defaultMessage="No mappings defined."
        />
      }
      iconType="pin"
      data-test-subj="noMappingsCallout"
      size="s"
    />
  );
};
